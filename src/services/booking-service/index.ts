import bookingRepository from "@/repositories/booking-repository";
import { notFoundError, forbiddenError } from "@/errors";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import hotelRepository from "@/repositories/hotel-repository";
import { exclude } from "@/utils/prisma-utils";

async function getUserBooking(userId: number) {
  const booking = await bookingRepository.findUserBooking(userId);
  if (!booking) {
    throw notFoundError();
  } 
  return { ...exclude(booking, "createdAt", "updatedAt", "userId", "roomId"),
    Room: { ...exclude(booking.Room, "createdAt", "updatedAt") } };
}

async function postUserBooking(userId: number, roomId: number) {
  const findEnrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if(!findEnrollment) {
    throw forbiddenError(); 
  }
 
  const findTicketByEnrollmentId = await ticketRepository.findTicketByEnrollmentId(findEnrollment.id);
  if(!findTicketByEnrollmentId || findTicketByEnrollmentId.status === "RESERVED") {
    throw forbiddenError();
  }
 
  if(findTicketByEnrollmentId.TicketType.isRemote || !findTicketByEnrollmentId.TicketType.includesHotel) {
    throw forbiddenError();
  }
  
  const findRoom = await hotelRepository.findRoomById(roomId);
  if(!findRoom) {
    throw notFoundError();
  }
  
  const bookingCapacity = await bookingRepository.findBookings(roomId);
  if(findRoom.capacity <= bookingCapacity.length) {
    throw forbiddenError();
  } 
  
  const findBooking = await bookingRepository.findUserBooking(userId);
  if(findBooking) {
    throw forbiddenError();
  }
  const booking = await bookingRepository.postBooking(userId, roomId); 
  return booking;
}

async function putUserBooking(userId: number, bookingId: number, roomId: number) {
  const findUserBooking = await bookingRepository.findUserBookings(userId);
  
  if(!findUserBooking) {
    throw forbiddenError();    
  }
  
  if(findUserBooking.id !== bookingId) {
    throw forbiddenError();    
  }

  const findRoom = await hotelRepository.findRoomById(roomId);
  if(!findRoom) {
    throw notFoundError();
  }

  const bookingCapacity = await bookingRepository.findBookings(roomId);
  if(findRoom.capacity <= bookingCapacity.length) {
    throw forbiddenError();
  } 

  const newBooking = await bookingRepository.createNewBooking(findUserBooking.id, roomId); 
  return newBooking;
}
const bookingService = {
  getUserBooking,  
  postUserBooking,
  putUserBooking,
};

export default bookingService;
