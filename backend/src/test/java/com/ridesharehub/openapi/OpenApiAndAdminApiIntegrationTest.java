package com.ridesharehub.openapi;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.rating.repository.RatingRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.route.repository.RouteRepository;
import com.ridesharehub.security.JwtService;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.repository.RouteProposalRepository;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:openapi_admin_api_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;LOCK_TIMEOUT=10000;INIT=RUNSCRIPT FROM 'classpath:h2-domains.sql'",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "jwt.signer-key=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "booking.policy.auto-confirm=true"
        })
class OpenApiAndAdminApiIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private RouteRepository routeRepository;
    @Autowired private TripRepository tripRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private TripStopRepository tripStopRepository;
    @Autowired private RouteProposalRepository routeProposalRepository;
    @Autowired private TripIncidentRepository tripIncidentRepository;
    @Autowired private RatingRepository ratingRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        ratingRepository.deleteAll();
        tripIncidentRepository.deleteAll();
        tripStopRepository.deleteAll();
        routeProposalRepository.deleteAll();
        bookingRepository.deleteAll();
        tripRepository.deleteAll();
        routeRepository.deleteAll();
        driverRepository.deleteAll();
        vehicleRepository.deleteAll();
        companyRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void swaggerUiAndOpenApiYaml_arePubliclyAccessibleAndDocumentSprint4Endpoints() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/v3/api-docs.yaml")));

        mockMvc.perform(get("/v3/api-docs.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/api/v1/bookings/{bookingId}/rating:")))
                .andExpect(content().string(containsString("/api/v1/admin/overview:")))
                .andExpect(content().string(containsString("/api/v1/admin/users:")))
                .andExpect(content().string(containsString("/api/v1/admin/drivers:")))
                .andExpect(content().string(containsString("/api/v1/admin/trips:")));
    }

    @Test
    void adminAndRatingHttpEndpoints_enforceRbacValidationAndContracts() throws Exception {
        User admin = userRepository.save(new User("admin@api.vn", "hash", "Admin User", UserRole.ADMIN));
        User owner = userRepository.save(new User("owner@api.vn", "hash", "Owner User", UserRole.TRANSPORT_COMPANY));
        User passenger = userRepository.save(new User("pax@api.vn", "hash", "Passenger One", UserRole.PASSENGER));

        TransportCompany company = new TransportCompany(owner, "Nhà Xe API", "Đà Nẵng", "0905111222", "Đại diện", "Info");
        company.approve(admin);
        company = companyRepository.save(company);

        Vehicle vehicle = vehicleRepository.save(new Vehicle(company, "43A-99999", "Limousine 7 chỗ", "Kia", "Carnival", 7));
        Driver driver = driverRepository.save(new Driver(company, "Tài Xế An", "0905333444", "D2-99881"));
        Route route = routeRepository.save(new Route(company, "Đà Nẵng - Hội An", "Đà Nẵng", "Hội An", 45, new BigDecimal("100000")));

        Trip trip = new Trip(route, company, vehicle, driver, Instant.now().plus(2, ChronoUnit.HOURS), new BigDecimal("100000"));
        trip.publish();
        trip.acceptAssignment();
        trip.startTrip();
        trip.completeTrip();
        trip = tripRepository.save(trip);

        Booking booking = new Booking(
                "BK-HTTP01",
                trip,
                passenger,
                "idem-http-01",
                1,
                "Điểm đón A",
                new BigDecimal("16.0544"),
                new BigDecimal("108.2022"),
                "Điểm trả B",
                new BigDecimal("15.8801"),
                new BigDecimal("108.3380"),
                new BigDecimal("100000"),
                true);
        booking.markPickedUp();
        booking.markCompleted();
        booking = bookingRepository.save(booking);

        String adminToken = jwtService.createAccessToken(admin);
        String paxToken = jwtService.createAccessToken(passenger);

        // Unauthenticated -> 401
        mockMvc.perform(get("/api/v1/admin/overview"))
                .andExpect(status().isUnauthorized());

        // PASSENGER cannot access Admin directories -> 403
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + paxToken))
                .andExpect(status().isForbidden());

        // ADMIN can query overview + paginated users/drivers/trips -> 200
        mockMvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCompanies").value(1))
                .andExpect(jsonPath("$.data.totalUsers").value(3))
                .andExpect(jsonPath("$.data.totalDrivers").value(1))
                .andExpect(jsonPath("$.data.completedTrips").value(1));

        mockMvc.perform(get("/api/v1/admin/users?page=0&size=2&role=PASSENGER")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.items[0].email").value("pax@api.vn"));

        mockMvc.perform(get("/api/v1/admin/drivers?page=0&size=5")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].fullName").value("Tài Xế An"))
                .andExpect(jsonPath("$.data.items[0].totalTrips").value(1));

        mockMvc.perform(get("/api/v1/admin/trips?page=0&size=5&status=COMPLETED")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].routeName").value("Đà Nẵng - Hội An"));

        // Invalid rating score (6) -> 4xx validation error
        mockMvc.perform(post("/api/v1/bookings/" + booking.getId() + "/rating")
                        .header("Authorization", "Bearer " + paxToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\":6}"))
                .andExpect(status().is4xxClientError());

        // Valid rating -> 201 CREATED
        mockMvc.perform(post("/api/v1/bookings/" + booking.getId() + "/rating")
                        .header("Authorization", "Bearer " + paxToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripScore\":5,\"driverScore\":5,\"companyScore\":4,\"comment\":\"Rất tốt\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.score").value(5))
                .andExpect(jsonPath("$.data.comment").value("Rất tốt"));

        // Duplicate rating -> 409 CONFLICT
        mockMvc.perform(post("/api/v1/bookings/" + booking.getId() + "/rating")
                        .header("Authorization", "Bearer " + paxToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tripScore\":5,\"driverScore\":5,\"companyScore\":5}"))
                .andExpect(status().isConflict());

        // GET rating -> 200 OK
        mockMvc.perform(get("/api/v1/bookings/" + booking.getId() + "/rating")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.score").value(5));
    }
}
