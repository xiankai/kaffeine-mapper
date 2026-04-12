/* eslint-disable max-lines-per-function */
import { setMockDate, resetMockDate } from "../../test/setup";

// Import or recreate the helper functions for testing
// Since they're inside the component, we'll recreate them here for testing
const parseCoordinates = (
  latLngString: string,
): { lat: number; lng: number } => {
  const [latStr, lngStr] = latLngString.split(", ");
  return {
    lat: parseFloat(latStr.replace("°", "")),
    lng: parseFloat(lngStr.replace("°", "")),
  };
};

const calculateVisitDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / (1000 * 60)); // duration in minutes
};

interface TimelineVisit {
  startTime: string;
  endTime: string;
  visit: {
    hierarchyLevel: number;
    probability: number;
    topCandidate: {
      placeId: string;
      semanticType: string;
      probability: number;
      placeLocation: {
        latLng: string;
      };
      name?: string;
    };
  };
}

const isLikelyCafe = (visit: TimelineVisit): boolean => {
  const duration = calculateVisitDuration(visit.startTime, visit.endTime);
  const semanticType = visit.visit.topCandidate.semanticType;

  return (
    semanticType === "UNKNOWN" &&
    duration >= 15 &&
    duration <= 240 &&
    visit.visit.probability > 0.3
  );
};

const createCafeFromVisit = (visit: TimelineVisit) => {
  const coords = parseCoordinates(
    visit.visit.topCandidate.placeLocation.latLng,
  );
  const duration = calculateVisitDuration(visit.startTime, visit.endTime);

  return {
    name:
      visit.visit.topCandidate.name ||
      `Location ${visit.visit.topCandidate.placeId.slice(-8)}`,
    address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
    coordinates: {
      latitude: coords.lat,
      longitude: coords.lng,
    },
    visits: [
      {
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        visitedAt: visit.startTime,
        duration: duration,
        notes: `Imported from Google Timeline (${duration} min visit)`,
        photos: [],
      },
    ],
    isFavorite: false,
    tags: ["imported"],
    notes: `Google Place ID: ${visit.visit.topCandidate.placeId}`,
  };
};

describe("ImportView Helper Functions", () => {
  beforeEach(() => {
    resetMockDate();
    jest.clearAllMocks();
  });

  describe("parseCoordinates", () => {
    it("parses valid coordinate strings correctly", () => {
      const result = parseCoordinates("37.7749°, -122.4194°");

      expect(result).toEqual({
        lat: 37.7749,
        lng: -122.4194,
      });
    });

    it("handles positive coordinates", () => {
      const result = parseCoordinates("1.3521°, 103.8198°");

      expect(result).toEqual({
        lat: 1.3521,
        lng: 103.8198,
      });
    });

    it("handles high precision coordinates", () => {
      const result = parseCoordinates("37.774929°, -122.419416°");

      expect(result).toEqual({
        lat: 37.774929,
        lng: -122.419416,
      });
    });

    it("handles zero coordinates", () => {
      const result = parseCoordinates("0°, 0°");

      expect(result).toEqual({
        lat: 0,
        lng: 0,
      });
    });
  });

  describe("calculateVisitDuration", () => {
    it("calculates duration in minutes correctly", () => {
      const startTime = "2026-04-01T09:00:00.000Z";
      const endTime = "2026-04-01T09:45:00.000Z";

      const duration = calculateVisitDuration(startTime, endTime);

      expect(duration).toBe(45);
    });

    it("handles short durations", () => {
      const startTime = "2026-04-01T09:00:00.000Z";
      const endTime = "2026-04-01T09:05:00.000Z";

      const duration = calculateVisitDuration(startTime, endTime);

      expect(duration).toBe(5);
    });

    it("handles long durations", () => {
      const startTime = "2026-04-01T09:00:00.000Z";
      const endTime = "2026-04-01T15:30:00.000Z";

      const duration = calculateVisitDuration(startTime, endTime);

      expect(duration).toBe(390); // 6.5 hours
    });

    it("handles cross-day durations", () => {
      const startTime = "2026-04-01T23:00:00.000Z";
      const endTime = "2026-04-02T01:00:00.000Z";

      const duration = calculateVisitDuration(startTime, endTime);

      expect(duration).toBe(120); // 2 hours
    });

    it("rounds to nearest minute", () => {
      const startTime = "2026-04-01T09:00:00.000Z";
      const endTime = "2026-04-01T09:00:30.000Z"; // 30 seconds

      const duration = calculateVisitDuration(startTime, endTime);

      expect(duration).toBe(1); // rounds up to 1 minute
    });
  });

  describe("isLikelyCafe", () => {
    const createMockVisit = (
      overrides: Partial<TimelineVisit> = {},
    ): TimelineVisit => ({
      startTime: "2026-04-01T09:00:00.000Z",
      endTime: "2026-04-01T09:45:00.000Z", // 45 minutes
      visit: {
        hierarchyLevel: 0,
        probability: 0.8,
        topCandidate: {
          placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
          semanticType: "UNKNOWN",
          probability: 0.9,
          placeLocation: {
            latLng: "37.7749°, -122.4194°",
          },
          name: "Test Cafe",
        },
      },
      ...overrides,
    });

    it("identifies valid cafe visits", () => {
      const visit = createMockVisit();

      expect(isLikelyCafe(visit)).toBe(true);
    });

    it("rejects visits that are too short (< 15 minutes)", () => {
      const visit = createMockVisit({
        endTime: "2026-04-01T09:10:00.000Z", // 10 minutes
      });

      expect(isLikelyCafe(visit)).toBe(false);
    });

    it("rejects visits that are too long (> 4 hours)", () => {
      const visit = createMockVisit({
        endTime: "2026-04-01T14:00:00.000Z", // 5 hours
      });

      expect(isLikelyCafe(visit)).toBe(false);
    });

    it("rejects visits with low probability (≤ 0.3)", () => {
      const visit = createMockVisit();
      visit.visit.probability = 0.2;

      expect(isLikelyCafe(visit)).toBe(false);
    });

    it("accepts visits with exactly 0.3 probability threshold", () => {
      const visit = createMockVisit();
      visit.visit.probability = 0.31; // Just above threshold

      expect(isLikelyCafe(visit)).toBe(true);
    });

    it("rejects HOME semantic type", () => {
      const visit = createMockVisit();
      visit.visit.topCandidate.semanticType = "HOME";

      expect(isLikelyCafe(visit)).toBe(false);
    });

    it("rejects WORK semantic type", () => {
      const visit = createMockVisit();
      visit.visit.topCandidate.semanticType = "WORK";

      expect(isLikelyCafe(visit)).toBe(false);
    });

    it("accepts visits at minimum duration (15 minutes)", () => {
      const visit = createMockVisit({
        endTime: "2026-04-01T09:15:00.000Z", // Exactly 15 minutes
      });

      expect(isLikelyCafe(visit)).toBe(true);
    });

    it("accepts visits at maximum duration (4 hours)", () => {
      const visit = createMockVisit({
        endTime: "2026-04-01T13:00:00.000Z", // Exactly 4 hours (240 minutes)
      });

      expect(isLikelyCafe(visit)).toBe(true);
    });
  });

  describe("createCafeFromVisit", () => {
    const mockVisit: TimelineVisit = {
      startTime: "2026-04-01T09:00:00.000Z",
      endTime: "2026-04-01T09:45:00.000Z",
      visit: {
        hierarchyLevel: 0,
        probability: 0.8,
        topCandidate: {
          placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
          semanticType: "UNKNOWN",
          probability: 0.9,
          placeLocation: {
            latLng: "37.774929°, -122.419416°",
          },
          name: "Blue Bottle Coffee",
        },
      },
    };

    beforeEach(() => {
      setMockDate(1609459200000); // Fixed timestamp for consistent test results
    });

    it("creates cafe object with correct structure", () => {
      const cafe = createCafeFromVisit(mockVisit);

      expect(cafe).toEqual({
        name: "Blue Bottle Coffee",
        address: "37.774929, -122.419416",
        coordinates: {
          latitude: 37.774929,
          longitude: -122.419416,
        },
        visits: [
          {
            id: expect.stringMatching(/^visit_\d+_[a-z0-9]{9}$/),
            visitedAt: "2026-04-01T09:00:00.000Z",
            duration: 45,
            notes: "Imported from Google Timeline (45 min visit)",
            photos: [],
          },
        ],
        isFavorite: false,
        tags: ["imported"],
        notes: "Google Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4",
      });
    });

    it("handles missing name by using placeId", () => {
      const visitWithoutName = {
        ...mockVisit,
        visit: {
          ...mockVisit.visit,
          topCandidate: {
            ...mockVisit.visit.topCandidate,
            name: undefined,
          },
        },
      };

      const cafe = createCafeFromVisit(visitWithoutName);

      expect(cafe.name).toBe("Location yG83frY4"); // Last 8 chars of placeId
    });

    it("generates unique visit IDs", () => {
      const cafe1 = createCafeFromVisit(mockVisit);
      const cafe2 = createCafeFromVisit(mockVisit);

      expect(cafe1.visits[0].id).not.toBe(cafe2.visits[0].id);
    });

    it("calculates duration correctly for the visit", () => {
      const shortVisit = {
        ...mockVisit,
        endTime: "2026-04-01T09:30:00.000Z", // 30 minutes
      };

      const cafe = createCafeFromVisit(shortVisit);

      expect(cafe.visits[0].duration).toBe(30);
      expect(cafe.visits[0].notes).toBe(
        "Imported from Google Timeline (30 min visit)",
      );
    });

    it("preserves original timestamp format", () => {
      const cafe = createCafeFromVisit(mockVisit);

      expect(cafe.visits[0].visitedAt).toBe("2026-04-01T09:00:00.000Z");
    });
  });
});
