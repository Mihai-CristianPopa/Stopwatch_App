import { ObjectId } from "mongodb";
import logger from "../logger.js";
import { errorObj, infoLog } from "../loggerHelper.js";
import { ERROR_OBJECTS } from "../utils/constants.js";
import { createBook } from "../services/bookService.js";

const MAX_STRING_LEN = 300;

export const createBookController = async (req, res) => {
  const startTime = Date.now();
  const METHOD_FAILURE_MESSAGE = "createBookController failed.";

  function handleError(err) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, err));
    return res.status(err.statusCode).json(err);
  }

  const { title, author, image_url, source, notes, category } = req.body;

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

  try {
    const userId = new ObjectId(req.user.id);
    const now = new Date().toISOString();

    const doc = {
      user_id: userId,
      title: title.trim(),
      author: author.trim(),
      status: "wishlist",
      image_url: image_url ? image_url.trim() : null,
      source: source ? source.trim() : null,
      rating: null,
      notes: notes ? notes.trim() : null,
      category: category ? category.trim() : null,
      date_added: now.slice(0, 10),
      date_read: null,
      created_at: now,
      updated_at: now,
    };

    const result = await createBook(doc);

    infoLog(req, startTime, `Book created for user ${req.user.email}`);
    return res.status(201).json({ ...doc, _id: result.insertedId });

  } catch (error) {
    logger.error(METHOD_FAILURE_MESSAGE, errorObj(req, startTime, error));
    return res.status(500).json(ERROR_OBJECTS.FRONTEND_INTERNAL_SERVER_ERROR);
  }
};
