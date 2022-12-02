import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { getBooking, postBooking } from "@/controllers";

const bookingRouter = Router();

bookingRouter
  .all("/*", authenticateToken)
  .get("/", getBooking)
  .post("/", postBooking);
 
export { bookingRouter };
