export type Client = {
  // GET /api/v1/visitors/:visitorId
  getVisitor(visitorId: string): Promise<unknown>;
  // POST /api/v1/identifier
  postIdentifier(): Promise<unknown>;
  // POST /api/v1/assignment_override
  postAssignmentOverride(): Promise<unknown>;
  // POST /api/v1/assignment_event
  postAssignmentEvent(): Promise<unknown>;
};

type ClientConfig = {
  baseURL: string;
};

export function createClient(config: ClientConfig): Client {
  return {
    /* Implementation here */
  };
}
