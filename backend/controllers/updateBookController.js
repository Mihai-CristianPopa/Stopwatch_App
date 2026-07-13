import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { updateBook, getBookById, getMinSortOrder } from "../services/bookService.js";

const VALID_STATUSES = ["wishlist", "read"];
const MAX_STRING_LEN = 300;
const UPDATABLE_FIELDS = ["title", "author", "image_url", "source", "rating", "notes", "category", "date_read", "date_read_precision", "status", "sort_order"];

// Accept YYYY, YYYY-MM, or YYYY-MM-DD
const DATE_YEAR_RE = /^\d{4}$/;
const DATE_MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function inferPrecision(dateStr) {
  if (DATE_DAY_RE.test(dateStr)) return "day";
  if (DATE_MONTH_RE.test(dateStr)) return "month";
  if (DATE_YEAR_RE.test(dateStr)) return "year";
  return null;
}

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
      if (val !== null && !DATE_YEAR_RE.test(val) && !DATE_MONTH_RE.test(val) && !DATE_DAY_RE.test(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("date_read must be YYYY, YYYY-MM, YYYY-MM-DD format, or null."));
      }
      $set.date_read = val;
      // When clearing date_read, also clear precision (unless caller supplies it explicitly)
      if (val === null && !("date_read_precision" in req.body)) {
        $set.date_read_precision = null;
      }
    } else if (field === "date_read_precision") {
      if (val !== null && !["year", "month", "day"].includes(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("date_read_precision must be 'year', 'month', 'day', or null."));
      }
      $set.date_read_precision = val;
    } else if (field === "status") {
      if (!VALID_STATUSES.includes(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("status must be 'wishlist' or 'read'."));
      }
      $set.status = val;
    } else if (field === "sort_order") {
      if (!Number.isInteger(val)) {
        return handleError(ERROR_OBJECTS.INVALID_BOOK("sort_order must be an integer."));
      }
      $set.sort_order = val;
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

    // When status transitions to 'read', assign a fresh top slot in the Read list
    if ($set.status === "read" && !("sort_order" in req.body)) {
      const min = await getMinSortOrder(userId, "read");
      $set.sort_order = min - 1;
    }

    // Lazy backfill: if the existing book has no sort_order and caller didn't supply one, assign top slot
    if (!("sort_order" in req.body) && !($set.status === "read")) {
      const existing = await getBookById(userId, id);
      if (existing && existing.sort_order == null) {
        const min = await getMinSortOrder(userId, existing.status);
        $set.sort_order = min - 1;
      }
    }

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
