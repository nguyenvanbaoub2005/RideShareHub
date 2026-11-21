"""
SP3-P1-02: Vehicle Routing Problem with Pickups and Deliveries (VRPPD)
powered by Google OR-Tools with hard precedence, capacity, and safe timeout guarantees.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from optimizer.schemas import (
    BookingStopInput,
    LocationPoint,
    OptimizedStopOutput,
    OptimizeTripRouteRequest,
    OptimizeTripRouteResponse,
)

# Typical road detour multiplier vs straight-line Haversine distance
ROAD_DETOUR_FACTOR = 1.25
# Dwell time per pickup/dropoff stop (minutes)
STOP_DWELL_MINUTES = 2


@dataclass(frozen=True)
class _StopNode:
    booking_id: int
    stop_type: Literal["PICKUP", "DROPOFF"]
    label: str
    latitude: float
    longitude: float
    seat_delta: int


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometers multiplied by road detour factor."""
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return radius_km * c * ROAD_DETOUR_FACTOR


def _point_distance_meters(a: tuple[float, float], b: tuple[float, float]) -> int:
    return int(round(haversine_km(a[0], a[1], b[0], b[1]) * 1000.0))


def _compute_baseline_distance_km(
    start_coord: tuple[float, float] | None,
    end_coord: tuple[float, float] | None,
    bookings: list[BookingStopInput],
) -> float:
    """Naive baseline: all pickups in input order, then all dropoffs in input order."""
    if not bookings:
        return 0.0
    seq: list[tuple[float, float]] = []
    if start_coord is not None:
        seq.append(start_coord)
    for b in bookings:
        seq.append((b.pickup.latitude, b.pickup.longitude))
    for b in bookings:
        seq.append((b.dropoff.latitude, b.dropoff.longitude))
    if end_coord is not None:
        seq.append(end_coord)

    total = 0.0
    for i in range(len(seq) - 1):
        total += haversine_km(seq[i][0], seq[i][1], seq[i + 1][0], seq[i + 1][1])
    return round(total, 2)


def _greedy_fallback_order(
    start_coord: tuple[float, float],
    bookings: list[BookingStopInput],
    vehicle_capacity: int,
) -> list[_StopNode]:
    """Deterministic greedy feasible VRPPD solver used only if OR-Tools times out."""
    remaining_pickups = {b.booking_id: b for b in bookings}
    on_board: dict[int, BookingStopInput] = {}
    current_coord = start_coord
    current_seats = 0
    ordered: list[_StopNode] = []

    while remaining_pickups or on_board:
        candidates: list[tuple[float, _StopNode]] = []
        for b in remaining_pickups.values():
            if current_seats + b.seat_count <= vehicle_capacity:
                dist = haversine_km(
                    current_coord[0], current_coord[1], b.pickup.latitude, b.pickup.longitude
                )
                candidates.append(
                    (
                        dist,
                        _StopNode(
                            booking_id=b.booking_id,
                            stop_type="PICKUP",
                            label=b.pickup.label,
                            latitude=b.pickup.latitude,
                            longitude=b.pickup.longitude,
                            seat_delta=b.seat_count,
                        ),
                    )
                )
        for b in on_board.values():
            dist = haversine_km(
                current_coord[0], current_coord[1], b.dropoff.latitude, b.dropoff.longitude
            )
            candidates.append(
                (
                    dist,
                    _StopNode(
                        booking_id=b.booking_id,
                        stop_type="DROPOFF",
                        label=b.dropoff.label,
                        latitude=b.dropoff.latitude,
                        longitude=b.dropoff.longitude,
                        seat_delta=-b.seat_count,
                    ),
                )
            )
        if not candidates:
            raise ValueError("Cannot construct a feasible route within vehicle capacity")

        candidates.sort(key=lambda item: (item[0], item[1].booking_id, item[1].stop_type))
        chosen = candidates[0][1]
        ordered.append(chosen)
        current_coord = (chosen.latitude, chosen.longitude)
        current_seats += chosen.seat_delta
        if chosen.stop_type == "PICKUP":
            on_board[chosen.booking_id] = remaining_pickups.pop(chosen.booking_id)
        else:
            on_board.pop(chosen.booking_id)

    return ordered


def _solve_with_ortools(
    start_coord: tuple[float, float],
    end_coord: tuple[float, float] | None,
    bookings: list[BookingStopInput],
    vehicle_capacity: int,
    time_limit_seconds: float,
) -> tuple[list[_StopNode], str] | None:
    """
    Model single-vehicle Pickup and Delivery Problem with Capacity (VRPPD):
    - Node 0: start depot (start_point or first pickup location)
    - Nodes 1..2N: pickup and dropoff nodes (for booking i: pickup = 1 + 2*i, dropoff = 2 + 2*i)
    - Node 2N+1: end depot (end_point if provided, otherwise virtual zero-cost open end)
    """
    stop_nodes: list[_StopNode] = []
    for b in bookings:
        stop_nodes.append(
            _StopNode(
                booking_id=b.booking_id,
                stop_type="PICKUP",
                label=b.pickup.label,
                latitude=b.pickup.latitude,
                longitude=b.pickup.longitude,
                seat_delta=b.seat_count,
            )
        )
        stop_nodes.append(
            _StopNode(
                booking_id=b.booking_id,
                stop_type="DROPOFF",
                label=b.dropoff.label,
                latitude=b.dropoff.latitude,
                longitude=b.dropoff.longitude,
                seat_delta=-b.seat_count,
            )
        )

    num_stops = len(stop_nodes)
    start_node = 0
    end_node = num_stops + 1
    total_nodes = num_stops + 2

    coords: list[tuple[float, float] | None] = [start_coord]
    for s in stop_nodes:
        coords.append((s.latitude, s.longitude))
    coords.append(end_coord)

    # Distance matrix in meters
    dist_matrix: list[list[int]] = [[0] * total_nodes for _ in range(total_nodes)]
    for i in range(total_nodes):
        for j in range(total_nodes):
            if i == j:
                dist_matrix[i][j] = 0
            elif j == end_node and end_coord is None:
                # Open-end route: zero cost from last stop to virtual end node
                dist_matrix[i][j] = 0
            elif i == end_node and end_coord is None:
                dist_matrix[i][j] = 0
            else:
                c_i = coords[i]
                c_j = coords[j]
                if c_i is not None and c_j is not None:
                    dist_matrix[i][j] = _point_distance_meters(c_i, c_j)

    demands = [0] + [s.seat_delta for s in stop_nodes] + [0]

    manager = pywrapcp.RoutingIndexManager(total_nodes, 1, [start_node], [end_node])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return dist_matrix[from_node][to_node]

    transit_cb_idx = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_idx)

    # Distance dimension (needed for pickup-before-delivery precedence constraint)
    max_route_meters = max(1_000_000, sum(max(row) for row in dist_matrix) + 100_000)
    routing.AddDimension(
        transit_cb_idx,
        0,  # no slack
        max_route_meters,
        True,  # start cumul to zero
        "Distance",
    )
    distance_dimension = routing.GetDimensionOrDie("Distance")

    # Capacity dimension (enforces 0 <= seats_on_board <= vehicle_capacity at all stops)
    def demand_callback(from_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_cb_idx = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_cb_idx,
        0,
        [vehicle_capacity],
        True,
        "Capacity",
    )

    # Pickup & Delivery precedence constraints for every booking
    solver = routing.solver()
    for idx in range(len(bookings)):
        pickup_node = 1 + 2 * idx
        dropoff_node = 2 + 2 * idx
        pickup_index = manager.NodeToIndex(pickup_node)
        dropoff_index = manager.NodeToIndex(dropoff_node)
        routing.AddPickupAndDelivery(pickup_index, dropoff_index)
        solver.Add(routing.VehicleVar(pickup_index) == routing.VehicleVar(dropoff_index))
        solver.Add(
            distance_dimension.CumulVar(pickup_index)
            <= distance_dimension.CumulVar(dropoff_index)
        )

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.FromMilliseconds(int(round(time_limit_seconds * 1000)))

    solution = routing.SolveWithParameters(search_params)
    if solution is None:
        return None

    ordered: list[_StopNode] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if 1 <= node <= num_stops:
            ordered.append(stop_nodes[node - 1])
        index = solution.Value(routing.NextVar(index))

    status_code = routing.status()
    status_name = "OPTIMAL" if status_code == 1 else "FEASIBLE"
    return ordered, status_name


def _verify_invariants(ordered: list[_StopNode], vehicle_capacity: int) -> int:
    """Hard post-verification: PICKUP before DROPOFF for every booking & capacity never exceeded."""
    picked_up: set[int] = set()
    dropped_off: set[int] = set()
    seats = 0
    max_seats = 0

    for stop in ordered:
        if stop.stop_type == "PICKUP":
            if stop.booking_id in picked_up:
                raise ValueError(f"Duplicate pickup for booking {stop.booking_id}")
            picked_up.add(stop.booking_id)
        else:
            if stop.booking_id not in picked_up:
                raise ValueError(
                    f"Precedence violation: DROPOFF before PICKUP for booking {stop.booking_id}"
                )
            if stop.booking_id in dropped_off:
                raise ValueError(f"Duplicate dropoff for booking {stop.booking_id}")
            dropped_off.add(stop.booking_id)

        seats += stop.seat_delta
        if seats < 0 or seats > vehicle_capacity:
            raise ValueError(
                f"Capacity violation: seats_on_board={seats} exceeds capacity={vehicle_capacity}"
            )
        max_seats = max(max_seats, seats)

    if picked_up != dropped_off:
        raise ValueError("Not all picked-up bookings were dropped off")
    return max_seats


def solve_vrppd(req: OptimizeTripRouteRequest) -> OptimizeTripRouteResponse:
    """Optimize pickup & dropoff stop sequence for a shared-ride trip."""
    if not req.bookings:
        return OptimizeTripRouteResponse(
            trip_id=req.trip_id,
            solver_engine="OR-TOOLS-VRPPD",
            solver_status="OPTIMAL",
            total_distance_km=0.0,
            baseline_distance_km=0.0,
            distance_saved_km=0.0,
            total_duration_minutes=0,
            max_seats_on_board=0,
            vehicle_capacity=req.vehicle_capacity,
            ordered_stops=[],
        )

    # Validate duplicate booking IDs and single-booking capacity feasibility
    seen_ids: set[int] = set()
    for b in req.bookings:
        if b.booking_id in seen_ids:
            raise ValueError(f"Duplicate booking_id {b.booking_id} in optimization request")
        seen_ids.add(b.booking_id)
        if b.seat_count > req.vehicle_capacity:
            raise ValueError(
                f"Booking {b.booking_id} requires {b.seat_count} seats, exceeding vehicle capacity {req.vehicle_capacity}"
            )

    start_coord: tuple[float, float] = (
        (req.start_point.latitude, req.start_point.longitude)
        if req.start_point is not None
        else (req.bookings[0].pickup.latitude, req.bookings[0].pickup.longitude)
    )
    end_coord: tuple[float, float] | None = (
        (req.end_point.latitude, req.end_point.longitude)
        if req.end_point is not None
        else None
    )

    baseline_km = _compute_baseline_distance_km(
        start_coord if req.start_point is not None else None,
        end_coord,
        req.bookings,
    )

    solver_engine = "OR-TOOLS-VRPPD"
    ortools_result = _solve_with_ortools(
        start_coord=start_coord,
        end_coord=end_coord,
        bookings=req.bookings,
        vehicle_capacity=req.vehicle_capacity,
        time_limit_seconds=req.time_limit_seconds,
    )

    if ortools_result is not None:
        ordered_nodes, solver_status = ortools_result
    else:
        ordered_nodes = _greedy_fallback_order(start_coord, req.bookings, req.vehicle_capacity)
        solver_engine = "GREEDY-FALLBACK-VRPPD"
        solver_status = "FALLBACK_FEASIBLE"

    max_seats = _verify_invariants(ordered_nodes, req.vehicle_capacity)

    # Build response metrics along ordered stops
    ordered_outputs: list[OptimizedStopOutput] = []
    prev_coord: tuple[float, float] | None = (
        start_coord if req.start_point is not None else None
    )
    cum_dist_km = 0.0
    cum_seats = 0
    cum_minutes = 0.0

    for idx, node in enumerate(ordered_nodes, start=1):
        if prev_coord is not None:
            seg_km = haversine_km(prev_coord[0], prev_coord[1], node.latitude, node.longitude)
        else:
            seg_km = 0.0

        cum_dist_km += seg_km
        cum_seats += node.seat_delta
        drive_mins = (seg_km / req.average_speed_kmh) * 60.0
        cum_minutes += drive_mins + (STOP_DWELL_MINUTES if idx > 1 else 0)

        ordered_outputs.append(
            OptimizedStopOutput(
                stop_order=idx,
                booking_id=node.booking_id,
                stop_type=node.stop_type,
                label=node.label,
                latitude=node.latitude,
                longitude=node.longitude,
                seat_delta=node.seat_delta,
                cumulative_seats_on_board=cum_seats,
                distance_from_prev_km=round(seg_km, 2),
                cumulative_distance_km=round(cum_dist_km, 2),
                eta_offset_minutes=int(round(cum_minutes)),
            )
        )
        prev_coord = (node.latitude, node.longitude)

    if end_coord is not None and prev_coord is not None:
        tail_km = haversine_km(prev_coord[0], prev_coord[1], end_coord[0], end_coord[1])
        cum_dist_km += tail_km
        cum_minutes += (tail_km / req.average_speed_kmh) * 60.0

    total_distance_km = round(cum_dist_km, 2)
    distance_saved_km = round(max(0.0, baseline_km - total_distance_km), 2)
    total_duration_minutes = max(1, int(round(cum_minutes))) if ordered_outputs else 0

    return OptimizeTripRouteResponse(
        trip_id=req.trip_id,
        solver_engine=solver_engine,
        solver_status=solver_status,
        total_distance_km=total_distance_km,
        baseline_distance_km=baseline_km,
        distance_saved_km=distance_saved_km,
        total_duration_minutes=total_duration_minutes,
        max_seats_on_board=max_seats,
        vehicle_capacity=req.vehicle_capacity,
        ordered_stops=ordered_outputs,
    )
