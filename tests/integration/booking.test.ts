import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createUser,
  createEnrollmentWithAddress,
  createTicketTypeWithHotel,
  createTicket,
  createPayment,
  createHotel,
  createBooking,
  createTicketTypeRemote,
  createRoom,   
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when user has no booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);

      expect(response.body).toEqual({});
    });

    it("should respond with status 200 and the boookig data", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);

      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual(
        {
          id: createdBooking.id,
          Room: {
            id: createdRoom.id,
            name: createdRoom.name,
            capacity: createdRoom.capacity,
            hotelId: createdRoom.hotelId,
          }
        }
      );
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when user has no enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const ticketType = await createTicketTypeRemote();
      
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
 
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user ticket is remote ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has a booking already", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 4);
      const createdBooking = await createBooking(user.id, createdRoom.id);
         
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const fakeRoomId = createdRoom.id+1;
 
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: fakeRoomId });
           
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
      
    it("should respond with status 404 when roomId is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const invalidRoomId = 0;

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: invalidRoomId });
           
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when there is no roomId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
           
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({});
           
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
         
    it("should respond with status 403 when room has full capacity ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 1);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and booking data ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 5);
      const beforeCreateBooking = await prisma.booking.findMany({
        where: { userId: user.id }
      });      
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      const bookingId = await prisma.booking.findFirst({
        where: { userId: user.id }
      });
     
      const collateralEffect = await prisma.booking.findMany({
        where: { userId: user.id }
      });
           
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ id: bookingId.id });
      expect(beforeCreateBooking.length).toEqual(0);
      expect(collateralEffect.length).toEqual(1); 
    });
  }); 
});

describe("PUT /booking/:bookigId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when user does not have booking to updade ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);

      const response = await server.put(`/booking/${createdRoom.id}}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
           
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });    

    it("should respond with status 404 when roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const fakeRoomId = createdRoom.id+1;

      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: fakeRoomId });
           
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
  
    it("should respond with status 404 when roomId is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const invalidRoomId = 0;

      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: invalidRoomId });
           
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
        
    it("should respond with status 403 when there is no roomId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdBooking = await createBooking(user.id, createdRoom.id);
          
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({});
           
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
        
    it("should respond with status 403 when bookingId param does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdNewRoom = await createRoom(createdHotel.id, 2);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const fakeBookinId = createdBooking.id+1;

      const response = await server.put(`/booking/${fakeBookinId}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdNewRoom.id });
           
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when bookingId param is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdNewRoom = await createRoom(createdHotel.id, 2);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const invalidBookingId = 0;

      const response = await server.put(`/booking/${invalidBookingId}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdNewRoom.id });
           
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
  
    it("should respond with status 403 when there is no bookingId param", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 3);
      const createdNewRoom = await createRoom(createdHotel.id, 2);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.put("/booking/").set("Authorization", `Bearer ${token}`).send({ roomId: createdNewRoom.id });
           
      expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
    });
        
    it("should respond with status 200 and the updated booking data ", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoom(createdHotel.id, 5);
      const createdNewRoom = await createRoom(createdHotel.id, 2);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const beforeUpdateBooking = await prisma.booking.findMany({
        where: { userId: user.id }
      });      
      
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdNewRoom.id });
           
      const bookingId = await prisma.booking.findFirst({
        where: { userId: user.id }
      });
        
      const collateralEffect = await prisma.booking.findMany({
        where: { userId: user.id }
      });
           
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ id: bookingId.id });
      expect(beforeUpdateBooking.length).toEqual(1); 
      expect(collateralEffect.length).toEqual(1);           
    });
  }); 
});
