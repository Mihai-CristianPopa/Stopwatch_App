import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { bulkReorder } from "../services/bookService.js";

const VALID_STATUSES = ["wishlist", "read"];

export const reorderBooksController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "reorderBooksController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { status, ids } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("status must be 'wishlist' or 'read'"));
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("ids must be a non-empty array."));
  }
  for (const id of ids) {
    if (!ObjectId.isValid(id)) {
      return handleError(ERROR_OBJECTS.INVALID_BOOK(`Invalid book id: ${id}`));
    }
  }

  try {
    const userId = new ObjectId(req.user.id);
    const result = await bulkReorder(userId, status, ids);

    infoLog(req, startTime, `Books reordered for user ${req.user.email} (status=${status}, count=${ids.length})`);
    return res.status(200).json({ updated: result.modifiedCount });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
