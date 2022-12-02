import { prisma } from "@/config";

async function findUserBooking(userId: number) {
  return prisma.booking.findFirst({
    where: { userId },
    include: { 
      Room: true,
    }
  });
}

async function findBookings(roomId: number) {
  return prisma.booking.findMany({
    where: { roomId }
  });
}

async function postBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,            
    }
  });
}

const bookingRepository = {
  findUserBooking,  
  findBookings,
  postBooking,
};

export default bookingRepository;
