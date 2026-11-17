import { API_ROOT, createClient, DataPortabilityError } from "../client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function client(...responses: Response[]) {
  const fetchImpl = jest.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no response queued");
    return next;
  });
  return {
    fetchImpl,
    dpa: createClient({
      accessToken: async () => "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  };
}

const call = (fetchImpl: jest.Mock, n = 0) => {
  const [url, init] = fetchImpl.mock.calls[n] as [
    string,
    Parameters<typeof fetch>[1] & object,
  ];
  return {
    url,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
};

describe("Data Portability client", () => {
  it("initiates an archive with resources and an optional range", async () => {
    const { dpa, fetchImpl } = client(
      json({ archiveJobId: "job/1", accessType: "ACCESS_TYPE_TIME_BASED" }),
    );
    expect(
      await dpa.initiate(["saved.collections"], {
        startTime: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({ archiveJobId: "job/1", accessType: "ACCESS_TYPE_TIME_BASED" });
    expect(call(fetchImpl)).toEqual({
      url: `${API_ROOT}/portabilityArchive:initiate`,
      method: "POST",
      headers: {
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      },
      body: {
        resources: ["saved.collections"],
        startTime: "2026-01-01T00:00:00Z",
      },
    });
  });

  it("reads job state, retries, cancels, checks access and resets", async () => {
    const { dpa, fetchImpl } = client(
      json({ name: "n", state: "COMPLETE", urls: ["u"] }),
      json({ archiveJobId: "job/2" }),
      json({}),
      json({ timeBasedResources: ["saved.collections"] }),
      new Response("", { status: 200 }),
    );
    expect((await dpa.state("job/1")).urls).toEqual(["u"]);
    expect(await dpa.retry("job/1")).toBe("job/2");
    await dpa.cancel("job/1");
    expect(await dpa.checkAccessType()).toEqual({
      timeBasedResources: ["saved.collections"],
    });
    await dpa.resetAuthorization();
    expect(fetchImpl.mock.calls.map((_, n) => call(fetchImpl, n).url)).toEqual([
      `${API_ROOT}/archiveJobs/job%2F1/portabilityArchiveState`,
      `${API_ROOT}/archiveJobs/job%2F1:retry`,
      `${API_ROOT}/archiveJobs/job%2F1:cancel`,
      `${API_ROOT}/accessType:check`,
      `${API_ROOT}/authorization:reset`,
    ]);
    expect(call(fetchImpl).method).toBe("GET");
    expect(call(fetchImpl).headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("turns an already-exported 429 into an error with the next allowed time", async () => {
    const { dpa } = client(
      json(
        {
          error: {
            message: "Requested resources have already been exported.",
            status: "RESOURCE_EXHAUSTED",
            details: [
              { reason: "x" },
              {
                reason: "RESOURCE_EXHAUSTED_TIME_BASED",
                metadata: {
                  access_type: "ACCESS_TYPE_TIME_BASED",
                  timestamp_after_24hrs: "2026-11-18T00:00:00Z",
                },
              },
            ],
          },
        },
        429,
      ),
    );
    const error = await dpa.initiate(["saved.collections"]).catch((e) => e);
    expect(error).toBeInstanceOf(DataPortabilityError);
    expect(error).toMatchObject({
      message: "Requested resources have already been exported.",
      kind: "already-exported",
      status: 429,
      retryAfter: "2026-11-18T00:00:00Z",
      accessType: "ACCESS_TYPE_TIME_BASED",
    });
  });

  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not-found"],
    [503, "unavailable"],
    [429, "other"],
    [400, "other"],
  ])("classifies HTTP %s as %s", async (status, kind) => {
    const { dpa } = client(new Response("not json", { status }));
    await expect(dpa.state("j")).rejects.toMatchObject({
      kind,
      status,
      message: `Data Portability API returned ${status}`,
    });
  });

  it("defaults to the global fetch", async () => {
    const original = global.fetch;
    global.fetch = jest.fn(async () => json({})) as unknown as typeof fetch;
    await createClient({ accessToken: () => "t" }).cancel("j");
    expect(global.fetch).toHaveBeenCalled();
    global.fetch = original;
  });
});
