# Svelte Client for Subscriptions Plugin

Complete Svelte stores for the Better Auth subscriptions plugin. Provides reactive state management using Svelte's store system.

## Installation

```bash
npm install better-subscriptions better-auth
```

## Setup

```typescript
// src/lib/auth.ts
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client/svelte";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});
```

## Stores

### `createPlansStore(client)`

Fetch all public subscription plans.

```svelte
<script lang="ts">
  import { createPlansStore } from "better-subscriptions/client/svelte";
  import { authClient } from "$lib/auth";

  const { data: plans, isLoading, error, refetch } = createPlansStore(authClient);
</script>

{#if $isLoading}
  <p>Loading plans...</p>
{:else if $error}
  <p class="error">{$error.message}</p>
{:else}
  <div class="plans-grid">
    {#each $plans || [] as plan (plan.id)}
      <div class="plan-card">
        <h3>{plan.name}</h3>
        <p>{plan.description}</p>
      </div>
    {/each}
  </div>
{/if}
```

**Returns:**
- `data` - Readable store with array of plans
- `isLoading` - Readable store with loading state
- `error` - Readable store with error object
- `refetch()` - Function to manually refetch plans

---

### `createSubscriptionStore(client)`

Get current user's active subscription and advantages.

```svelte
<script lang="ts">
  const { subscription, advantages, isLoading, error, refetch } = 
    createSubscriptionStore(authClient);
</script>

{#if $subscription}
  <p>Current Plan: {$subscription.planId}</p>
  <p>Status: {$subscription.status}</p>
  
  <h3>Your Advantages:</h3>
  <ul>
    {#each $advantages as adv (adv.advantage.id)}
      <li>
        {adv.advantage.name}
        {#if adv.value !== null}
          : {adv.value}
        {/if}
      </li>
    {/each}
  </ul>
{:else}
  <p>No active subscription</p>
{/if}
```

**Returns:**
- `subscription` - Readable store with subscription object (null if none)
- `advantages` - Readable store with advantages array
- `isLoading` - Readable store with loading state
- `error` - Readable store with error object
- `refetch()` - Function to manually refetch

---

### `createSubscribeStore(client)`

Subscribe to a plan.

```svelte
<script lang="ts">
  import { createSubscribeStore } from "better-subscriptions/client/svelte";

  const { subscribe, subscription, isLoading, error } = createSubscribeStore(authClient);

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribe({
        planId,
        provider: "stripe",
        promoCode: "DISCOUNT10",
        quantity: 1,
      });
      alert("Subscription successful!");
    } catch (err) {
      console.error(err);
    }
  };
</script>

<button on:click={() => handleSubscribe("plan_123")} disabled={$isLoading}>
  {$isLoading ? "Subscribing..." : "Subscribe"}
</button>

{#if $error}
  <p class="error">{$error.message}</p>
{/if}
```

**Input:**
- `planId` (required) - Plan ID
- `provider` - Payment provider
- `promoCode` - Optional promo code
- `quantity` - Quantity multiplier
- `manualProofUrl` - For manual provider: proof of payment
- `manualMetadata` - For manual provider: optional metadata

**Returns:**
- `subscribe(input)` - Function to submit subscription
- `subscription` - Readable store with created subscription
- `isLoading` - Readable store with request state
- `error` - Readable store with error object

---

### `createChangePlanStore(client)`

Switch to a different plan.

```svelte
<script lang="ts">
  const { changePlan, isLoading, error } = createChangePlanStore(authClient);

  const handleChange = async () => {
    try {
      await changePlan("sub_123", "plan_456");
      alert("Plan changed!");
    } catch (err) {
      console.error(err);
    }
  };
</script>

<button on:click={handleChange} disabled={$isLoading}>
  {$isLoading ? "Changing..." : "Change Plan"}
</button>
```

**Parameters:**
- `subscriptionId` - Current subscription ID
- `newPlanId` - New plan ID

---

### `createCancelSubscriptionStore(client)`

Cancel a subscription.

```svelte
<script lang="ts">
  const { cancel, isLoading, error } = createCancelSubscriptionStore(authClient);

  const handleCancel = async () => {
    if (!confirm("Are you sure?")) return;
    try {
      await cancel("sub_123", true); // true = cancel at period end
      alert("Subscription canceled!");
    } catch (err) {
      console.error(err);
    }
  };
</script>

<button on:click={handleCancel} disabled={$isLoading} class="btn-danger">
  {$isLoading ? "Canceling..." : "Cancel"}
</button>
```

**Parameters:**
- `subscriptionId` - Subscription to cancel
- `atPeriodEnd` - If true, cancel at period end

---

### `createValidatePromoCodeStore(client)`

Validate a promo code.

```svelte
<script lang="ts">
  let promoCode = "";
  const { validate, data: promoData, isLoading, error } = 
    createValidatePromoCodeStore(authClient);

  const handleValidate = async () => {
    try {
      await validate(promoCode);
    } catch (err) {
      console.error(err);
    }
  };
</script>

<input bind:value={promoCode} placeholder="Enter code" />
<button on:click={handleValidate} disabled={$isLoading}>
  Validate
</button>

{#if $promoData}
  <p>Discount: {$promoData.value} {$promoData.type}</p>
{/if}
```

**Parameters:**
- `code` - Promo code to validate
- `planId` - Optional plan ID for plan-specific validation
- `partnerId` - Optional partner ID for partner-specific validation

---

### `createRecordUsageStore(client)`

Record usage for a metered advantage.

```svelte
<script lang="ts">
  let quantity = 1;
  const { record, isLoading, error } = createRecordUsageStore(authClient);

  const handleRecord = async () => {
    try {
      await record("sub_123", "api_calls", quantity);
      alert("Usage recorded!");
    } catch (err) {
      console.error(err);
    }
  };
</script>

<input type="number" bind:value={quantity} min="1" />
<button on:click={handleRecord} disabled={$isLoading}>
  Record Usage
</button>
```

**Parameters:**
- `subscriptionId` - Subscription ID
- `advantageKey` - Advantage key
- `quantity` - Quantity used

---

## Store Usage

All stores are Svelte `Readable` stores. Use the `$` prefix to subscribe:

```svelte
<script lang="ts">
  const { data: plans } = createPlansStore(authClient);
</script>

<!-- Automatically updates when data changes -->
{#each $plans as plan}
  <p>{plan.name}</p>
{/each}
```

---

## Error Handling

Each store includes error state:

```svelte
<script lang="ts">
  const { data, isLoading, error } = createPlansStore(authClient);
</script>

{#if $error}
  <div class="error">
    Failed to load: {$error.message}
  </div>
{/if}
```

Errors from async functions are also captured:

```svelte
<script lang="ts">
  const { subscribe, error } = createSubscribeStore(authClient);

  const handleSubscribe = async () => {
    try {
      await subscribe(input);
    } catch (err) {
      // Error is also in $error store
      console.error($error);
    }
  };
</script>
```

---

## Manual Provider Example

Subscribe with payment proof:

```svelte
<script lang="ts">
  let proofFile: File | null = null;
  const { subscribe } = createSubscribeStore(authClient);

  const handleSubscribe = async () => {
    let proofUrl: string | undefined;

    if (proofFile) {
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
      reader.readAsDataURL(proofFile);
    }
  };
</script>

<input type="file" bind:files={[proofFile]} accept="image/*,.pdf" />
<button on:click={handleSubscribe}>Subscribe</button>
```

---

## TypeScript Support

All stores are fully typed:

```svelte
<script lang="ts">
  import type { Plan, Subscription } from "better-subscriptions/types";

  const { data: plans } = createPlansStore(authClient);
  // $plans is typed as (Plan | null)

  const { subscription } = createSubscriptionStore(authClient);
  // $subscription is typed as (Subscription | null)
</script>
```

---

## Auto-Fetch Behavior

`createPlansStore` and `createSubscriptionStore` automatically fetch data on creation:

```svelte
<script lang="ts">
  // Data starts fetching immediately
  const { data } = createPlansStore(authClient);
</script>
```

To manually refetch:

```svelte
<script lang="ts">
  const { data, refetch } = createPlansStore(authClient);

  const handleRefresh = async () => {
    await refetch();
  };
</script>

<button on:click={handleRefresh}>Refresh</button>
```

---

## Best Practices

1. **Call store creators at component top level**
   ```svelte
   <!-- ✅ Good -->
   <script lang="ts">
     const { data } = createPlansStore(authClient);
   </script>

   <!-- ❌ Avoid creating in handlers -->
   ```

2. **Use descriptive variable names**
   ```svelte
   <script lang="ts">
     const { data: plans, isLoading: plansLoading } = createPlansStore(authClient);
   </script>

   {#if $plansLoading}...{/if}
   ```

3. **Handle all states in UI**
   ```svelte
   {#if $isLoading}
     <p>Loading...</p>
   {:else if $error}
     <p>Error: {$error.message}</p>
   {:else}
     <p>Data: {$data}</p>
   {/if}
   ```

---

## Examples

See `examples.svelte` for complete working examples of:
- Listing plans
- Subscribing to a plan
- Viewing current subscription
- Changing/canceling plans
- Validating promo codes
- Recording usage

---

## Browser Support

Works with modern browsers supporting:
- Fetch API
- Promise
- Proxy (for reactivity)

Svelte 3.0+

---

## License

Same as Better Auth
