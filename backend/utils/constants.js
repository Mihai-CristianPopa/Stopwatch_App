export const registrationErrorMessageUserWithEmailExists = (email) => `Registration failed because there already exists an user with email address ${email}.`;

export const loginErrorMessageNoUserFoundForTheEmail = (email) => `Login failed because there is no user with the email address ${email}`;

export const loginErrorMessageWrongPassword = (email) => `Login failed due to the fact that the introduced password is wrong for the user with email address ${email}`;

export const loginErrorMessageWrongCredentialsFrontendFacing = "Login failed due to invalid email or password";

const STANDARD_UNAUTH_COOKIE_OBJ = {
  statusCode: 401,
  message: "User is not authenticated."
}

export const INFO_MESSAGE = {
  USER_REGISTERED: (email) => `User ${email} registered and successfully received an email confirmation.`,
  LOGIN_SESSION_CREATED: (sessionId, email) => `Login session with id ${sessionId} has been created for user with email address ${email}`,
  USER_LOGGED_IN: (email) => `User with email ${email} has been logged in.`,
  USER_LOGGED_OUT: "User was logged out successfully.",
}

export const ERROR_OBJECTS = {
    BAD_REQUEST: (missingField) =>  {
        return {
          statusCode: 400,
          message: "Missing required inputs. Ensure that all necessary fields are included or calculated correctly.",
          details: `Missing field: ${missingField}`
        }
    },
    INVALID_INTERVAL: (details) => {
      return {
        statusCode: 400,
        message: "Invalid interval data.",
        details: details || "start_time must be before end_time and all fields must be valid."
      };
    },
    INTERVAL_TOO_LONG: () => {
      return {
        statusCode: 400,
        message: "Interval exceeds maximum allowed duration of 24 hours."
      };
    },
    USER_ALREADY_EXISTS: (email) => {
      return {
        statusCode: 400,
        message: registrationErrorMessageUserWithEmailExists(email)
      };
    },
    NO_COOKIE_FOUND: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "No session cookie found.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    INVALID_SESSION_ID: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Invalid session ID format.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    SESSION_NOT_FOUND: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Session not found in the database.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    SESSION_EXPIRED: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Session expired.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    NO_COOKIE_LOGOUT: () => {
      STANDARD_UNAUTH_COOKIE_OBJ.details = "Logout attempt without session cookie.";
      return STANDARD_UNAUTH_COOKIE_OBJ;
    },
    NO_USER_FOUND_WITH_EMAIL: (email) => {
      return {
        statusCode: 401,
        message: loginErrorMessageNoUserFoundForTheEmail(email)
      };
    },
    WRONG_PASSWORD: (email) => {
      return {
        statusCode: 401,
        message: loginErrorMessageWrongPassword(email)
      };
    },
    FRONTEND_INTERNAL_SERVER_ERROR: {
      statusCode: 500,
      message: "Internal server error. Please try again later.",
    },
    INVALID_BOOK: (details) => ({
      statusCode: 400,
      message: "Invalid book data.",
      details: details || "title and author are required and all fields must be valid.",
    }),
    BOOK_NOT_FOUND: () => ({
      statusCode: 404,
      message: "Book not found.",
    }),
}

export const DB_KEYS = {
  AUTH_DB: "stopwatch_auth",
  SESSIONS_COLLECTION: "sessions",
  TTL_FIELD: "last_login_time"
}