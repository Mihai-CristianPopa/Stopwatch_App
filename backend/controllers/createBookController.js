import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { createBook, getMinSortOrder } from "../services/bookService.js";

const MAX_STRING_LEN = 300;
const VALID_STATUSES = ["wishlist", "read"];
const DATE_YEAR_RE = /^\d{4}$/;
const DATE_MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createBookController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "createBookController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { title, author, image_url, source, notes, category, status, rating, date_read, date_read_precision } = req.body;

  if (title === undefined || title === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("title"));
  }
  if (author === undefined || author === null) {
    return handleError(ERROR_OBJECTS.BAD_REQUEST("author"));
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > MAX_STRING_LEN) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("title must be a non-empty string up to 300 characters."));
  }
  if (typeof author !== "string" || author.trim().length === 0 || author.trim().length > MAX_STRING_LEN) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("author must be a non-empty string up to 300 characters."));
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("status must be 'wishlist' or 'read'."));
  }
  if (image_url !== undefined && image_url !== null && typeof image_url !== "string") {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("image_url must be a string."));
  }
  if (source !== undefined && source !== null && typeof source !== "string") {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("source must be a string."));
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("notes must be a string."));
  }
  if (category !== undefined && category !== null && typeof category !== "string") {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("category must be a string."));
  }
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("rating must be an integer between 1 and 5, or null."));
  }
  if (date_read !== undefined && date_read !== null &&
      !DATE_YEAR_RE.test(date_read) && !DATE_MONTH_RE.test(date_read) && !DATE_DAY_RE.test(date_read)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("date_read must be YYYY, YYYY-MM, or YYYY-MM-DD format, or null."));
  }
  if (date_read_precision !== undefined && date_read_precision !== null &&
      !["year", "month", "day"].includes(date_read_precision)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("date_read_precision must be 'year', 'month', 'day', or null."));
  }

  try {
    const userId = new ObjectId(req.user.id);
    const now = new Date().toISOString();
    const resolvedStatus = status || "wishlist";

    const minSortOrder = await getMinSortOrder(userId, resolvedStatus);

    const doc = {
      user_id: userId,
      title: title.trim(),
      author: author.trim(),
      status: resolvedStatus,
      image_url: image_url ? image_url.trim() : null,
      source: source ? source.trim() : null,
      rating: (resolvedStatus === "read" && rating != null) ? rating : null,
      notes: notes ? notes.trim() : null,
      category: category ? category.trim() : null,
      date_added: now.slice(0, 10),
      date_read: (resolvedStatus === "read" && date_read) ? date_read : null,
      date_read_precision: (resolvedStatus === "read" && date_read_precision) ? date_read_precision : null,
      sort_order: minSortOrder - 1,
      created_at: now,
      updated_at: now,
    };

    const result = await createBook(doc);

    infoLog(req, startTime, `Book created for user ${req.user.email} (status=${resolvedStatus})`);
    return res.status(201).json({ ...doc, _id: result.insertedId });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
