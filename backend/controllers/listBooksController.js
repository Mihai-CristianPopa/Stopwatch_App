import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { listBooks } from "../services/bookService.js";

const VALID_STATUSES = ["wishlist", "read"];

export const listBooksController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "listBooksController failed.";

  const { status } = req.query;

  if (!status || !VALID_STATUSES.includes(status)) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, ERROR_OBJECTS.BAD_REQUEST("status")));
    return res.status(400).json(ERROR_OBJECTS.BAD_REQUEST("status must be 'wishlist' or 'read'"));
  }

  try {
    const userId = new ObjectId(req.user.id);
    const books = await listBooks(userId, status);

    const result = books.map(b => ({ ...b, _id: b._id.toString(), user_id: b.user_id.toString() }));

    infoLog(req, startTime, `Books listed for user ${req.user.email} (status=${status})`);
    return res.status(200).json(result);

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
