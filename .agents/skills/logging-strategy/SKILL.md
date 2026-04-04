---
name: logging-strategy
description: "Comprehensive logging strategy with structured log levels, critical action tracking, and error reporting service integration. Use for implementing observability, debugging, and production monitoring."
argument-hint: "Optional: specify application areas or log types to focus strategy on"
---

# Logging Strategy

## When to Use

- Implementing structured logging across application layers
- Setting up error monitoring and alerting systems
- Establishing debugging and observability practices
- Creating audit trails for critical business operations
- Integrating with error reporting and monitoring services

## Logging Strategy Checklist

### Log Level Implementation

**Standard Log Levels (RFC 5424)**

- [ ] **FATAL/CRITICAL** - System unusable, immediate attention required
- [ ] **ERROR** - Application errors, exceptions, failures
- [ ] **WARN** - Warning conditions, potential issues
- [ ] **INFO** - General informational messages, key events
- [ ] **DEBUG** - Detailed information for diagnosing problems
- [ ] **TRACE** - Very detailed information, function entry/exit

**Log Level Usage Guidelines**

- [ ] Production defaults to INFO level or higher
- [ ] DEBUG/TRACE levels configurable for troubleshooting
- [ ] No sensitive data logged at any level
- [ ] Consistent log level usage across application
- [ ] Log level configuration environment-specific
- [ ] Performance impact considered for verbose levels

### Critical Action Logging

**Business Operations Audit Trail**

- [ ] User authentication and authorization events
- [ ] Data creation, modification, and deletion operations
- [ ] Financial transactions and payment processing
- [ ] Permission changes and role assignments
- [ ] System configuration changes
- [ ] API access and rate limiting events

**Security Event Logging**

- [ ] Failed authentication attempts
- [ ] Suspicious activity patterns
- [ ] Permission violations and unauthorized access attempts
- [ ] Data export and bulk operations
- [ ] Admin privilege usage
- [ ] Security policy changes

**System Health Metrics**

- [ ] Application startup and shutdown events
- [ ] Database connection status changes
- [ ] External service integration status
- [ ] Performance threshold violations
- [ ] Resource utilization alerts
- [ ] Scheduled job execution status

### Error Reporting Integration

**Error Monitoring Service Setup**

- [ ] Integration with Sentry, Bugsnag, or similar service
- [ ] Automatic error capturing and reporting
- [ ] User context and breadcrumbs included
- [ ] Error grouping and deduplication configured
- [ ] Release tracking for regression identification
- [ ] Performance monitoring enabled

**Error Context Enrichment**

- [ ] User ID and session information attached
- [ ] Request ID for distributed tracing
- [ ] Environment and deployment version tagged
- [ ] Custom tags for business context
- [ ] Stack traces and source maps available
- [ ] Related logs and metrics linked

## Logging Implementation Examples

### Structured Logging Setup (Node.js/Winston)

```javascript
// logger.js
const winston = require("winston");
const { combine, timestamp, errors, json, printf } = winston.format;

// Custom format for development
const developmentFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
  }`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp(),
    errors({ stack: true }),
    process.env.NODE_ENV === "development" ? developmentFormat : json(),
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || "app",
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    new winston.transports.Console(),

    // File transports for production
    ...(process.env.NODE_ENV === "production"
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 10,
          }),
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 10,
          }),
        ]
      : []),
  ],
});

// Add request correlation ID
logger.addRequestId = (req, res, next) => {
  req.requestId = req.headers["x-request-id"] || require("crypto").randomUUID();

  logger.defaultMeta.requestId = req.requestId;
  res.setHeader("X-Request-ID", req.requestId);
  next();
};

module.exports = logger;
```

### Critical Action Logging Patterns

```javascript
// audit.js - Business operation logging
const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.File({ filename: "logs/audit.log" })],
});

class AuditService {
  static logUserAction(userId, action, details = {}) {
    auditLogger.info("User action performed", {
      type: "USER_ACTION",
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
    });
  }

  static logDataChange(userId, entity, operation, before, after) {
    auditLogger.info("Data modification", {
      type: "DATA_CHANGE",
      userId,
      entity,
      operation, // CREATE, UPDATE, DELETE
      before: operation === "CREATE" ? null : before,
      after: operation === "DELETE" ? null : after,
      timestamp: new Date().toISOString(),
    });
  }

  static logSecurityEvent(type, details) {
    auditLogger.warn("Security event detected", {
      type: "SECURITY_EVENT",
      event: type,
      details,
      timestamp: new Date().toISOString(),
      severity: "HIGH",
    });
  }

  static logSystemEvent(event, metadata = {}) {
    auditLogger.info("System event", {
      type: "SYSTEM_EVENT",
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}

// Usage examples
AuditService.logUserAction("user123", "LOGIN", {
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
});

AuditService.logDataChange(
  "user123",
  "User",
  "UPDATE",
  { email: "old@example.com" },
  { email: "new@example.com" },
);

AuditService.logSecurityEvent("FAILED_LOGIN", {
  email: "attacker@evil.com",
  attempts: 5,
  ip: "malicious-ip",
});
```

### Error Reporting Integration (Sentry)

```javascript
// errorReporting.js
const Sentry = require("@sentry/node");
const logger = require("./logger");

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Custom configuration
  beforeSend(event) {
    // Filter out sensitive information
    if (event.request) {
      delete event.request.headers?.authorization;
      delete event.request.data?.password;
    }
    return event;
  },
});

class ErrorReporter {
  static captureException(error, context = {}) {
    // Log to local logs first
    logger.error("Exception captured", {
      error: error.message,
      stack: error.stack,
      ...context,
    });

    // Send to Sentry with context
    Sentry.withScope((scope) => {
      // Add user context
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Add request context
      if (context.requestId) {
        scope.setTag("requestId", context.requestId);
      }

      // Add custom context
      scope.setContext("additional", context);

      // Capture the error
      Sentry.captureException(error);
    });
  }

  static captureMessage(message, level = "info", context = {}) {
    logger[level](message, context);

    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setContext("additional", context);
      Sentry.captureMessage(message);
    });
  }

  static addBreadcrumb(message, category, data = {}) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }

  static setUserContext(user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
}

// Express middleware for automatic error reporting
const errorReportingMiddleware = (err, req, res, next) => {
  ErrorReporter.captureException(err, {
    userId: req.user?.id,
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  next(err);
};

module.exports = { ErrorReporter, errorReportingMiddleware };
```

### Application Logging Middleware

```javascript
// loggingMiddleware.js
const logger = require("./logger");

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request start
  logger.info("Request started", {
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: req.user?.id,
  });

  // Override res.end to log completion
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });

    originalEnd.apply(this, args);
  };

  next();
};

// Database query logging
const queryLogger = (query, duration) => {
  if (duration > 1000) {
    logger.warn("Slow database query detected", {
      query: query.sql || query,
      duration: `${duration}ms`,
      type: "PERFORMANCE_ISSUE",
    });
  } else if (process.env.LOG_LEVEL === "debug") {
    logger.debug("Database query executed", {
      query: query.sql || query,
      duration: `${duration}ms`,
    });
  }
};

// Performance monitoring
const performanceLogger = {
  measureTime: (name) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds

        if (duration > 100) {
          logger.warn("Performance threshold exceeded", {
            operation: name,
            duration: `${duration.toFixed(2)}ms`,
            type: "PERFORMANCE_ISSUE",
          });
        }

        return duration;
      },
    };
  },
};

module.exports = { requestLogger, queryLogger, performanceLogger };
```

## Log Management & Monitoring

### Log Aggregation (ELK Stack)

```yaml
# docker-compose.logging.yml
version: "3.8"

services:
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_URL: http://elasticsearch:9200
    depends_on:
      - elasticsearch

  logstash:
    image: logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### Log Rotation and Retention

```javascript
// Log rotation configuration
const DailyRotateFile = require("winston-daily-rotate-file");

const createRotatingTransport = (filename, level = "info") => {
  return new DailyRotateFile({
    filename: `logs/${filename}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "30d", // Keep logs for 30 days
    level,
  });
};

// Add to Winston transports
logger.add(createRotatingTransport("application"));
logger.add(createRotatingTransport("errors", "error"));
```

### Monitoring and Alerting Setup

```javascript
// alerting.js
const logger = require("./logger");

class AlertManager {
  static async sendAlert(severity, message, context = {}) {
    const alert = {
      severity, // INFO, WARNING, ERROR, CRITICAL
      message,
      context,
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME,
    };

    // Log the alert
    logger[severity.toLowerCase()](message, context);

    // Send to monitoring service (Slack, PagerDuty, etc.)
    if (severity === "CRITICAL" || severity === "ERROR") {
      await this.notifyOnCall(alert);
    }
  }

  static async notifyOnCall(alert) {
    // Integration with PagerDuty, Slack, etc.
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(alert);
    }
  }

  static async sendSlackNotification(alert) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    const payload = {
      text: `🚨 ${alert.severity}: ${alert.message}`,
      attachments: [
        {
          color: alert.severity === "CRITICAL" ? "danger" : "warning",
          fields: Object.entries(alert.context).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
        },
      ],
    };

    // Send to Slack webhook
    // Implementation depends on HTTP client
  }
}

module.exports = AlertManager;
```

## Production Logging Best Practices

### Security and Privacy

```javascript
// Sanitize sensitive data before logging
const sanitizeLogData = (data) => {
  const sensitiveFields = [
    "password",
    "token",
    "ssn",
    "creditCard",
    "authorization",
  ];

  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
};

// Use in logger
logger.info("User data updated", sanitizeLogData(userData));
```

### Performance Optimization

```javascript
// Lazy evaluation for expensive log operations
const expensiveOperation = () => {
  // Only execute if debug level is enabled
  if (logger.isLevelEnabled("debug")) {
    return computeExpensiveDebugInfo();
  }
  return null;
};

// Conditional logging
if (logger.isDebugEnabled()) {
  logger.debug("Debug info", {
    expensive: expensiveOperation(),
  });
}
```

### Structured Logging Schema

```javascript
// Standardized log entry structure
const createLogEntry = (level, message, context = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    requestId: context.requestId,
    userId: context.userId,
    correlationId: context.correlationId,
    ...context,
  };
};
```

## Logging Review Process

1. **Log Level Audit**
   - Review log output at different levels
   - Ensure appropriate information at each level
   - Verify no sensitive data in logs

2. **Performance Impact Assessment**
   - Measure logging overhead in production
   - Optimize expensive logging operations
   - Configure appropriate log levels for production

3. **Error Reporting Validation**
   - Test error capture and reporting flow
   - Verify context enrichment works correctly
   - Validate alert triggering and notification

4. **Compliance and Retention**
   - Review log retention policies
   - Ensure compliance with data protection regulations
   - Validate audit trail completeness

## Common Logging Issues

**Over-logging**

- Excessive DEBUG/TRACE logs in production
- Logging sensitive information
- Performance impact from verbose logging
- Log storage costs and management overhead

**Under-logging**

- Missing critical business operation logs
- Insufficient error context for debugging
- No audit trail for compliance requirements
- Gaps in observability and monitoring

**Poor Log Quality**

- Inconsistent log formats across services
- Missing correlation IDs for distributed tracing
- Unclear or generic error messages
- No structured data for log analysis

Remember: Logging is for future you and your team. Log what you need to debug production issues, satisfy compliance requirements, and understand user behavior. Balance verbosity with performance and storage costs.
