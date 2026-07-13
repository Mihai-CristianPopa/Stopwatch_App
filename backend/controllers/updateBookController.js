import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { updateBook } from "../services/bookService.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["wishlist", "read"];
const MAX_STRING_LEN = 300;
const UPDATABLE_FIELDS = ["title", "author", "image_url", "source", "rating", "notes", "category", "date_read", "status"];

export const updateBookController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "updateBookController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("Invalid book id."));
  }

  const $set = {};

  for (const field of UPDATABLE_FIELDS) {
    if (!(field in req.body)) continue;
    const val = req.body[field];

    if (field === "title") {
      if (typeof val !== "string" || val.trim().length === 0 || val.trim().length > MAX_STRING_LEN) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("title must be a non-empty string up to 300 characters."));
      }
      $set.title = val.trim();
    } else if (field === "author") {
      if (typeof val !== "string" || val.trim().length === 0 || val.trim().length > MAX_STRING_LEN) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("author must be a non-empty string up to 300 characters."));
      }
      $set.author = val.trim();
    } else if (field === "rating") {
      if (val !== null && (!Number.isInteger(val) || val < 1 || val > 5)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("rating must be an integer between 1 and 5, or null."));
      }
      $set.rating = val;
    } else if (field === "date_read") {
      if (val !== null && !DATE_RE.test(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("date_read must be YYYY-MM-DD format or null."));
      }
      $set.date_read = val;
    } else if (field === "status") {
      if (!VALID_STATUSES.includes(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("status must be 'wishlist' or 'read'."));
      }
      $set.status = val;
    } else {
      // image_url, source, notes, category — optional strings or null
      if (val !== null && typeof val !== "string") {
        return handleError(ERROR_OBJECTS.INVALID_BOOK(`${field} must be a string or null.`));
      }
      $set[field] = val !== null ? val.trim() : null;
    }
  }

  if (Object.keys($set).length === 0) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("no updatable fields provided"));
  }

  $set.updated_at = new Date().toISOString();

  try {
    const userId = new ObjectId(req.user.id);
    const result = await updateBook(userId, id, $set);

    if (!result) {
      return handleError(ERROR_OBJECTS.BOOK_NOT_FOUND());
    }

    const book = { ...result, _id: result._id.toString(), user_id: result.user_id.toString() };

    infoLog(req, startTime, `Book ${id} updated for user ${req.user.email}`);
    return res.status(200).json(book);

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
