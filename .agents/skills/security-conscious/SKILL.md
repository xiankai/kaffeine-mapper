---
name: security-conscious
description: "Web security best practices for user-facing features. Use for preventing XSS, CSRF, SQL injection, and other security vulnerabilities in frontend and backend code."
argument-hint: "Optional: specify features/components to focus security review on"
---

# Security Conscious Development

## When to Use

- Reviewing user-facing features for security vulnerabilities
- Implementing authentication and authorization systems
- Handling user input and data validation
- Setting up secure API endpoints and database queries
- Conducting security audits before deployment

## Security Checklist

### Input Validation & Sanitization

**Frontend Input Handling**

- [ ] All user inputs validated on both client and server side
- [ ] Input length limits enforced to prevent buffer overflows
- [ ] Special characters escaped or sanitized appropriately
- [ ] File upload restrictions (type, size, content validation)
- [ ] URL parameters validated and sanitized
- [ ] Form data validated with proper error handling

**Backend Input Validation**

- [ ] Server-side validation never trusts client-side data
- [ ] Input validation performed before database operations
- [ ] Whitelist validation preferred over blacklist
- [ ] Data type validation (strings, numbers, emails, etc.)
- [ ] Business logic validation (ranges, formats, constraints)
- [ ] Input sanitization prevents injection attacks

### Cross-Site Scripting (XSS) Prevention

**Output Encoding & Escaping**

- [ ] All dynamic content properly escaped for HTML context
- [ ] JavaScript strings escaped when inserting user data
- [ ] URL parameters encoded when used in links
- [ ] CSS values escaped when user-controlled
- [ ] JSON data encoded to prevent script injection
- [ ] Content Security Policy (CSP) headers implemented

**XSS Protection Strategies**

- [ ] Template engines auto-escape by default
- [ ] innerHTML usage avoided or sanitized
- [ ] DOMPurify or similar library used for HTML sanitization
- [ ] User-generated content rendered in safe contexts
- [ ] Markdown rendering secured against script injection
- [ ] Rich text editors properly configured

### Cross-Site Request Forgery (CSRF) Protection

**CSRF Token Implementation**

- [ ] CSRF tokens generated and validated for state-changing operations
- [ ] Tokens unique per session and request
- [ ] Tokens included in forms and AJAX requests
- [ ] SameSite cookie attribute configured correctly
- [ ] Double-submit cookie pattern implemented where appropriate
- [ ] GET requests never perform state changes

**Authentication & Session Security**

- [ ] Secure session management implemented
- [ ] Session tokens cryptographically secure and random
- [ ] Session timeout and idle timeout configured
- [ ] Session fixation attacks prevented
- [ ] Secure and HttpOnly cookie flags set
- [ ] Session data properly invalidated on logout

### SQL Injection Prevention

**Database Query Security**

- [ ] Parameterized queries/prepared statements used exclusively
- [ ] ORM/query builder used instead of string concatenation
- [ ] Database user has minimal required privileges
- [ ] Stored procedures use parameterized inputs
- [ ] Dynamic SQL construction avoided or heavily sanitized
- [ ] Database errors don't expose sensitive information

**Database Security Configuration**

- [ ] Database connections use least-privilege accounts
- [ ] Database server hardened and updated
- [ ] Sensitive data encrypted at rest
- [ ] Database backups secured and encrypted
- [ ] Connection strings secured (not in code/config files)
- [ ] Database access logging enabled

### Authentication & Authorization

**Authentication Security**

- [ ] Strong password policies enforced
- [ ] Password hashing uses bcrypt/Argon2 with proper salt
- [ ] Multi-factor authentication (MFA) available
- [ ] Account lockout protection against brute force
- [ ] Password reset tokens are secure and time-limited
- [ ] Login attempts logged and monitored

**Authorization Controls**

- [ ] Principle of least privilege enforced
- [ ] Role-based access control (RBAC) implemented
- [ ] Direct object references protected (no IDOR vulnerabilities)
- [ ] API endpoints require proper authorization
- [ ] Administrative functions properly protected
- [ ] Horizontal and vertical privilege escalation prevented

### API Security

**API Design Security**

- [ ] API rate limiting implemented
- [ ] API authentication required (API keys, OAuth, JWT)
- [ ] CORS policy properly configured
- [ ] API versioning strategy implemented
- [ ] Sensitive operations require elevated permissions
- [ ] API documentation doesn't expose sensitive information

**Data Protection**

- [ ] HTTPS enforced for all API communications
- [ ] Sensitive data not logged or cached
- [ ] Personal data handling complies with privacy regulations
- [ ] Data encryption in transit and at rest
- [ ] API responses don't include sensitive debugging info
- [ ] File downloads properly authenticated and authorized

## Security Implementation Examples

### Input Validation (Node.js/Express)

```javascript
// inputValidation.js
const validator = require("validator");
const rateLimit = require("express-rate-limit");

// Comprehensive input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Required field validation
      if (rules.required && (!value || value.trim() === "")) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value) {
        // Length validation
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} exceeds maximum length of ${rules.maxLength}`);
        }

        // Type validation
        if (rules.type === "email" && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }

        if (rules.type === "url" && !validator.isURL(value)) {
          errors.push(`${field} must be a valid URL`);
        }

        // Custom validation
        if (rules.custom && !rules.custom(value)) {
          errors.push(`${field} ${rules.customMessage || "is invalid"}`);
        }

        // Sanitization
        if (rules.sanitize) {
          req.body[field] = validator.escape(value.trim());
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Example usage
const userSchema = {
  email: {
    required: true,
    type: "email",
    maxLength: 254,
    sanitize: true,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    custom: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value),
    customMessage: "must contain uppercase, lowercase and number",
  },
  name: {
    required: true,
    maxLength: 100,
    sanitize: true,
    custom: (value) => /^[a-zA-Z\s]+$/.test(value),
    customMessage: "must contain only letters and spaces",
  },
};

app.post("/api/users", authLimiter, validateInput(userSchema), createUser);

module.exports = { validateInput, authLimiter };
```

### XSS Prevention (React)

```javascript
// XSS Prevention utilities
import DOMPurify from "dompurify";

// Safe HTML rendering component
const SafeHTML = ({ html, className }) => {
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "title"],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
};

// Safe URL validation
const isSafeURL = (url) => {
  try {
    const parsedURL = new URL(url);
    // Only allow http, https, and mailto protocols
    return ["http:", "https:", "mailto:"].includes(parsedURL.protocol);
  } catch {
    return false;
  }
};

// Safe link component
const SafeLink = ({ href, children, ...props }) => {
  if (!isSafeURL(href)) {
    return <span>{children}</span>;
  }

  const isExternal = !href.startsWith("/") && !href.startsWith("#");

  return (
    <a
      href={href}
      {...props}
      {...(isExternal && {
        target: "_blank",
        rel: "noopener noreferrer",
      })}
    >
      {children}
    </a>
  );
};

// Content Security Policy helper
const CSP_POLICY = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "connect-src": ["'self'", process.env.REACT_APP_API_BASE_URL],
  "frame-ancestors": ["'none'"],
};

export { SafeHTML, SafeLink, isSafeURL, CSP_POLICY };
```

### CSRF Protection Implementation

```javascript
// CSRF protection middleware
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

// CSRF protection setup
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// Middleware to provide CSRF token to frontend
const provideCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

app.use(cookieParser());
app.use(csrfProtection);
app.use(provideCsrfToken);

// API endpoint to get CSRF token
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Frontend CSRF token handling
class CSRFClient {
  constructor() {
    this.token = null;
    this.fetchToken();
  }

  async fetchToken() {
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "same-origin",
      });
      const data = await response.json();
      this.token = data.csrfToken;
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
    }
  }

  async makeRequest(url, options = {}) {
    if (!this.token) {
      await this.fetchToken();
    }

    return fetch(url, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.token,
        ...options.headers,
      },
    });
  }
}

const csrfClient = new CSRFClient();
export default csrfClient;
```

### SQL Injection Prevention (Database Queries)

```javascript
// Safe database query patterns
const db = require("./database");

// ✅ GOOD: Parameterized queries
const getUserById = async (userId) => {
  // Using parameterized query with placeholder
  const query = "SELECT * FROM users WHERE id = $1 AND active = true";
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

const searchUsers = async (searchTerm, limit = 10) => {
  const query = `
    SELECT id, name, email
    FROM users
    WHERE name ILIKE $1
    ORDER BY name
    LIMIT $2
  `;
  const result = await db.query(query, [`%${searchTerm}%`, limit]);
  return result.rows;
};

// ✅ GOOD: Using query builder (Knex.js example)
const getActiveUsersByRole = async (role) => {
  return await db("users")
    .select("id", "name", "email")
    .where("role", role)
    .andWhere("active", true)
    .orderBy("created_at", "desc");
};

// ✅ GOOD: ORM with proper validation (Sequelize example)
const createUser = async (userData) => {
  // Validation happens at model level
  const user = await User.create(
    {
      name: userData.name,
      email: userData.email,
      role: userData.role,
    },
    {
      fields: ["name", "email", "role"], // Explicitly specify allowed fields
    },
  );

  return user;
};

// ❌ BAD: Never do string concatenation
const unsafeQuery = async (userId) => {
  // This is vulnerable to SQL injection!
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return await db.query(query);
};

// Database connection security
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER, // Limited privileges user
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  pool: {
    min: 2,
    max: 10,
  },
  // Don't expose errors in production
  ...(process.env.NODE_ENV === "production" && {
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
};

module.exports = { getUserById, searchUsers, getActiveUsersByRole, createUser };
```

### Secure Authentication System

```javascript
// auth.js - Secure authentication implementation
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const rateLimit = require("express-rate-limit");

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

class AuthService {
  // Secure password hashing
  static async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  // Secure password verification
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure JWT token
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "your-app-name",
      audience: "your-app-users",
    });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: "your-app-name",
        audience: "your-app-users",
      });
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // Generate MFA secret
  static generateMFASecret(userEmail) {
    return speakeasy.generateSecret({
      name: `YourApp (${userEmail})`,
      issuer: "YourApp",
    });
  }

  // Verify MFA token
  static verifyMFAToken(token, secret) {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2, // Allow 2 time steps tolerance
    });
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Rate limiting for sensitive operations
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  AuthService,
  authenticateToken,
  strictRateLimit,
};
```

## Security Testing & Monitoring

### Security Testing Tools

```bash
# Install security scanning tools
npm install --save-dev eslint-plugin-security
npm install -g retire  # Check for known vulnerabilities
npm install --save-dev helmet  # Security headers

# OWASP ZAP for vulnerability scanning
docker run -t owasp/zap2docker-weekly zap-baseline.py -t http://localhost:3000

# Snyk for dependency vulnerability scanning
npm install -g snyk
snyk test
snyk monitor
```

### Security Headers Configuration

```javascript
// securityHeaders.js
const helmet = require("helmet");

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Adjust based on needs
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Additional security middleware
const additionalSecurity = (req, res, next) => {
  // Remove server information
  res.removeHeader("X-Powered-By");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS filtering
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
};

module.exports = { securityHeaders, additionalSecurity };
```

### Security Monitoring & Logging

```javascript
// securityLogger.js
const logger = require("./logger");

class SecurityLogger {
  static logSecurityEvent(event, details, req) {
    const securityEvent = {
      type: "SECURITY_EVENT",
      event,
      details,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(event),
    };

    // Log based on severity
    if (securityEvent.severity === "HIGH") {
      logger.error("High severity security event", securityEvent);
      // Trigger immediate alerts
      this.alertSecurityTeam(securityEvent);
    } else {
      logger.warn("Security event detected", securityEvent);
    }
  }

  static getSeverity(event) {
    const highSeverityEvents = [
      "SQL_INJECTION_ATTEMPT",
      "XSS_ATTEMPT",
      "PRIVILEGE_ESCALATION",
      "BRUTE_FORCE_DETECTED",
      "SUSPICIOUS_FILE_UPLOAD",
    ];

    return highSeverityEvents.includes(event) ? "HIGH" : "MEDIUM";
  }

  static alertSecurityTeam(event) {
    // Integration with alerting systems (Slack, PagerDuty, etc.)
    // Implementation depends on your alerting infrastructure
  }
}

// Usage in middleware
const securityMiddleware = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:)/i,
    /(union\s+select|drop\s+table|insert\s+into)/i,
    /(\.\.\/|\.\.\\)/, // Path traversal
  ];

  const userInput =
    JSON.stringify(req.body) + req.url + JSON.stringify(req.query);

  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(userInput)) {
      SecurityLogger.logSecurityEvent(
        "SUSPICIOUS_INPUT_DETECTED",
        { pattern: pattern.toString(), input: userInput.substring(0, 200) },
        req,
      );
    }
  });

  next();
};

module.exports = { SecurityLogger, securityMiddleware };
```

## Security Review Process

1. **Code Review Security Checklist**
   - Review all user input handling and validation
   - Verify proper output encoding and escaping
   - Check for hardcoded secrets or credentials
   - Validate authentication and authorization logic

2. **Automated Security Testing**
   - Run dependency vulnerability scans
   - Execute static code analysis for security issues
   - Perform dynamic application security testing (DAST)
   - Review security headers and CSP configuration

3. **Penetration Testing**
   - Test for common OWASP Top 10 vulnerabilities
   - Verify input validation and boundary conditions
   - Test authentication bypass scenarios
   - Validate session management security

4. **Security Documentation**
   - Document security measures implemented
   - Maintain threat model and risk assessment
   - Create incident response procedures
   - Regular security training for development team

## Common Security Issues

**Input Validation Failures**

- Trusting client-side validation only
- Insufficient server-side input sanitization
- Not validating file uploads properly
- Missing rate limiting on sensitive endpoints

**Authentication & Session Issues**

- Weak password policies or storage
- Session fixation vulnerabilities
- Missing multi-factor authentication
- Insecure session management

**Authorization Problems**

- Missing access controls on sensitive operations
- Horizontal privilege escalation vulnerabilities
- Direct object reference without authorization
- Overprivileged API access

**Data Exposure**

- Sensitive data in error messages
- Information disclosure through verbose logging
- Unencrypted sensitive data storage
- Missing HTTPS enforcement

Remember: Security is not a feature to be added later - it must be built into every aspect of development from day one. Assume all user input is malicious and validate accordingly. Regular security reviews and testing are essential for maintaining a secure application.
