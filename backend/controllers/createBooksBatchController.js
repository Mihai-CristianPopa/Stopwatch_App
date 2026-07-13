import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { createBooks, getMinSortOrder } from "../services/bookService.js";

const MAX_STRING_LEN = 300;
const MAX_BATCH_SIZE = 100;
const VALID_STATUSES = ["wishlist", "read"];

export const createBooksBatchController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "createBooksBatchController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { status, books } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("status must be 'wishlist' or 'read'."));
  }
  if (!Array.isArray(books) || books.length === 0) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK("books must be a non-empty array."));
  }
  if (books.length > MAX_BATCH_SIZE) {
    return handleError(ERROR_OBJECTS.INVALID_BOOK(`books must contain at most ${MAX_BATCH_SIZE} items.`));
  }
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    if (!b || typeof b.title !== "string" || b.title.trim().length === 0 || b.title.trim().length > MAX_STRING_LEN) {
      return handleError(ERROR_OBJECTS.INVALID_BOOK(`books[${i}].title must be a non-empty string up to 300 characters.`));
    }
    if (typeof b.author !== "string" || b.author.trim().length === 0 || b.author.trim().length > MAX_STRING_LEN) {
      return handleError(ERROR_OBJECTS.INVALID_BOOK(`books[${i}].author must be a non-empty string up to 300 characters.`));
    }
  }

  try {
    const userId = new ObjectId(req.user.id);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const minSortOrder = await getMinSortOrder(userId, status);

    const docs = books.map((b, i) => ({
      user_id: userId,
      title: b.title.trim(),
      author: b.author.trim(),
      status,
      image_url: null,
      source: null,
      rating: null,
      notes: null,
      category: null,
      date_added: today,
      date_read: null,
      date_read_precision: null,
      sort_order: minSortOrder - (books.length - i),
      created_at: now,
      updated_at: now,
    }));

    const result = await createBooks(docs);

    infoLog(req, startTime, `Batch created ${result.insertedCount} books for user ${req.user.email} (status=${status})`);
    return res.status(201).json({ inserted: result.insertedCount });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
