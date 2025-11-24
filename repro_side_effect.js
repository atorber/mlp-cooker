
const requestBody = {
    name: "test-service",
    resourcePool: {
        resourcePoolId: "original-pool",
        queueName: "original-queue"
    }
};

const resourcePoolId = "new-pool";
const queueName = "new-queue";

// Simulate the logic in createService
const body = { ...requestBody };

if (resourcePoolId || queueName) {
    if (!body.resourcePool) body.resourcePool = {};
    const resourcePool = body.resourcePool;
    if (resourcePoolId) resourcePool.resourcePoolId = resourcePoolId;
    if (queueName) resourcePool.queueName = queueName;
}

console.log("Original requestBody.resourcePool.resourcePoolId:", requestBody.resourcePool.resourcePoolId);
console.log("Modified body.resourcePool.resourcePoolId:", body.resourcePool.resourcePoolId);

if (requestBody.resourcePool.resourcePoolId === "new-pool") {
    console.log("SIDE EFFECT CONFIRMED: Original object was modified.");
} else {
    console.log("NO SIDE EFFECT: Original object was NOT modified.");
}
