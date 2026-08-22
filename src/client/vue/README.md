# Vue.js Client for Subscriptions Plugin

Complete Vue.js composables for the Better Auth subscriptions plugin. Provides reactive state management for subscription operations.

## Installation

```bash
npm install better-subscriptions better-auth vue
```

## Setup

```typescript
// main.ts
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client/vue";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});
```

## Composables

### `usePlans(client)`

Fetch all public subscription plans.

```typescript
<script setup lang="ts">
import { usePlans } from "better-subscriptions/client/vue";

const { data: plans, isLoading, error, refetch } = usePlans(authClient);
</script>

<template>
  <div v-if="isLoading">Loading plans...</div>
  <div v-if="error">{{ error.message }}</div>
  <div v-for="plan in plans" :key="plan.id">
    <h3>{{ plan.name }}</h3>
    <p>{{ plan.description }}</p>
  </div>
</template>
```

**Returns:**
- `data` - Array of plans
- `isLoading` - Loading state
- `error` - Error object if fetch failed
- `refetch()` - Manually refetch plans

---

### `useMySubscription(client)`

Get current user's active subscription and advantages.

```typescript
const {
  subscription,
  advantages,
  isLoading,
  error,
  refetch,
} = useMySubscription(authClient);
```

**Returns:**
- `subscription` - Current subscription object (null if none)
- `advantages` - Array of subscription advantages
- `isLoading` - Loading state
- `error` - Error object
- `refetch()` - Manually refetch subscription

---

### `useSubscribe(client)`

Subscribe to a plan.

```typescript
const { subscribe, subscription, isLoading, error } = useSubscribe(authClient);

const handleSubscribe = async () => {
  try {
    await subscribe({
      planId: "plan_123",
      provider: "stripe",
      promoCode: "DISCOUNT10",
      quantity: 2,
      // For manual provider:
      // manualProofUrl: "data:application/pdf;base64,...",
      // manualMetadata: { reference: "INV-001" },
    });
  } catch (err) {
    console.error(err);
  }
};
```

**Input:**
- `planId` (required) - Plan ID
- `provider` - Payment provider ('stripe', 'manual', etc)
- `promoCode` - Optional promo code
- `quantity` - Quantity multiplier
- `manualProofUrl` - For manual provider: proof of payment
- `manualMetadata` - For manual provider: optional metadata

**Returns:**
- `subscribe(input)` - Function to submit subscription
- `subscription` - Created subscription (after success)
- `isLoading` - Request in progress
- `error` - Error if failed

---

### `useChangePlan(client)`

Switch to a different plan.

```typescript
const { changePlan, isLoading, error } = useChangePlan(authClient);

const handleChange = async () => {
  try {
    await changePlan("sub_123", "plan_456");
  } catch (err) {
    console.error(err);
  }
};
```

**Parameters:**
- `subscriptionId` - Current subscription ID
- `newPlanId` - New plan ID

---

### `useCancelSubscription(client)`

Cancel a subscription.

```typescript
const { cancel, isLoading, error } = useCancelSubscription(authClient);

const handleCancel = async () => {
  try {
    await cancel("sub_123", true); // true = cancel at period end
  } catch (err) {
    console.error(err);
  }
};
```

**Parameters:**
- `subscriptionId` - Subscription to cancel
- `atPeriodEnd` - If true, cancel at period end; if false, cancel immediately

---

### `useValidatePromoCode(client)`

Validate a promo code.

```typescript
const { validate, data: promoData, isLoading, error } = useValidatePromoCode(
  authClient
);

const code = ref("");

const handleValidate = async () => {
  try {
    const result = await validate(code.value, "plan_123");
    console.log("Discount:", result.value, result.type);
  } catch (err) {
    console.error(err);
  }
};
```

**Parameters:**
- `code` - Promo code to validate
- `planId` - Optional plan ID (if plan-specific)
- `partnerId` - Optional partner ID (if partner-specific)

**Returns:**
- `data` - Validated promo code details
- `isLoading` - Validation in progress
- `error` - Error if validation failed

---

### `useRecordUsage(client)`

Record usage for a metered advantage.

```typescript
const { record, isLoading, error } = useRecordUsage(authClient);

const handleRecord = async () => {
  try {
    await record("sub_123", "api_calls", 100);
  } catch (err) {
    console.error(err);
  }
};
```

**Parameters:**
- `subscriptionId` - Subscription ID
- `advantageKey` - Advantage key (e.g., "api_calls")
- `quantity` - Quantity used

---

## Reactive Properties

All composables return computed properties, so they're automatically reactive:

```typescript
<script setup lang="ts">
const { data: plans, isLoading } = usePlans(authClient);

// Use directly in template - automatically updates
</script>

<template>
  <div v-if="isLoading" class="loading">Loading...</div>
  <div v-for="plan in plans" :key="plan.id">{{ plan.name }}</div>
</template>
```

---

## Error Handling

All composables provide error state:

```typescript
const { isLoading, error } = usePlans(authClient);

// Show error if request failed
if (error.value) {
  console.error("Request failed:", error.value.message);
}
```

Thrown errors from async functions also get captured:

```typescript
const { subscribe, error } = useSubscribe(authClient);

try {
  await subscribe(input);
} catch (err) {
  // Error is also in error.value
  console.error(error.value?.message);
}
```

---

## Manual Provider Example

Subscribe with payment proof for the manual provider:

```typescript
<script setup lang="ts">
const proofFile = ref<File | null>(null);
const { subscribe } = useSubscribe(authClient);

const handleSubscribe = async () => {
  let proofUrl: string | undefined;

  if (proofFile.value) {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      proofUrl = reader.result as string;

      await subscribe({
        planId: "plan_manual",
        provider: "manual",
        manualProofUrl: proofUrl,
        manualMetadata: {
          reference: "INV-2024-001",
          bankAccount: "IBAN-123",
        },
      });
    };
    reader.readAsDataURL(proofFile.value);
  }
};
</script>
```

---

## TypeScript Support

All composables are fully typed:

```typescript
import type { Plan, Subscription } from "better-subscriptions/types";

const { data: plans } = usePlans(authClient);
// plans is typed as Plan[]

const { subscription } = useMySubscription(authClient);
// subscription is typed as Subscription | null
```

---

## Best Practices

1. **Call composables at component setup level** (in `<script setup>`)
   ```typescript
   // ✅ Good
   const { data } = usePlans(authClient);

   // ❌ Bad (inside handlers)
   const handleClick = () => {
     const { data } = usePlans(authClient);
   };
   ```

2. **Refetch manually when needed**
   ```typescript
   const { refetch } = usePlans(authClient);

   const handleRefresh = async () => {
     await refetch();
   };
   ```

3. **Handle loading and error states**
   ```typescript
   <div v-if="isLoading">Loading...</div>
   <div v-else-if="error">{{ error.message }}</div>
   <div v-else>{{ data }}</div>
   ```

4. **Use async/await with try-catch for mutations**
   ```typescript
   const { subscribe, error } = useSubscribe(authClient);

   try {
     await subscribe(input);
   } catch (err) {
     // Handle error
   }
   ```

---

## Examples

See `examples.vue` for complete working examples of:
- Listing plans
- Subscribing to a plan
- Viewing current subscription
- Changing plans
- Canceling subscription
- Validating promo codes
- Recording usage

---

## Browser Support

Works with Vue 3.0+ and modern browsers that support:
- Fetch API
- Promise
- Proxy (for reactivity)

---

## License

Same as Better Auth
