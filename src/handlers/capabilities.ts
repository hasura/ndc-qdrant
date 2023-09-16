import { CapabilitiesResponse } from "../schemas/CapabilitiesResponse";

const capabilitiesResponse: CapabilitiesResponse = {
    "versions": "^0.1.0",
    "capabilities": {
        "query": {} // TODO: determine query capabilities
    },
    // explain: {} // TODO
    // mutations: {} // TODO
    // relationships: {} // TODO
}

export function getCapabilities(): CapabilitiesResponse {
    return capabilitiesResponse;
}