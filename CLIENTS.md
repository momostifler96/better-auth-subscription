# Better Subscriptions - Client Libraries

Complete client implementations for the Better Auth subscriptions plugin in multiple frameworks.

## Available Clients

### **React** (`src/client/react/`)

Full-featured React hooks for the subscriptions plugin.

**Hooks:**
- `usePlans()` - Fetch all public plans
- `useMySubscription()` - Get current subscription & advantages
- `useSubscribe()` - Subscribe to a plan
- `useChangePlan()` - Switch plans
- `useCancelSubscription()` - Cancel subscription
- `useValidatePromoCode()` - Validate promo codes
- `useRecordUsage()` - Record metered usage

**Example:**
```typescript
import { usePlans, useSubscribe } from "better-subscriptions/client/react";

export function PlansPage() {
  const { data: plans, isLoading, error } = usePlans(authClient);
  const { subscribe } = useSubscribe(authClient);

  return (
    <div>
      {plans.map(plan => (
        <button key={plan.id} onClick={() => subscribe({ planId: plan.id })}>
          Subscribe to {plan.name}
        </button>
      ))}
    </div>
  );
}
```

**Features:**
- Automatic state management
- Error handling included
- Refetch capabilities
- Full TypeScript support
- Manual provider file upload support

---

### **Vue.js** (`src/client/vue/`)

Complete Vue 3 composables using Composition API.

**Composables:**
- `usePlans()` - Fetch plans
- `useMySubscription()` - Current subscription
- `useSubscribe()` - Subscribe
- `useChangePlan()` - Change plan
- `useCancelSubscription()` - Cancel
- `useValidatePromoCode()` - Validate code
- `useRecordUsage()` - Record usage

**Example:**
```vue
<script setup lang="ts">
import { usePlans } from "better-subscriptions/client/vue";
import { authClient } from "@/auth";

const { data: plans, isLoading } = usePlans(authClient);
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else v-for="plan in plans" :key="plan.id">
    {{ plan.name }}
  </div>
</template>
```

**Features:**
- Computed properties for reactivity
- Composition API compatible
- Auto-fetch on mount
- Manual refetch support
- Full TypeScript support

---

### **Svelte** (`src/client/svelte/`)

Svelte stores for reactive state management.

**Store Creators:**
- `createPlansStore()` - Plans store
- `createSubscriptionStore()` - Subscription store
- `createSubscribeStore()` - Subscribe store
- `createChangePlanStore()` - Change plan store
- `createCancelSubscriptionStore()` - Cancel store
- `createValidatePromoCodeStore()` - Validate promo store
- `createRecordUsageStore()` - Record usage store

**Example:**
```svelte
<script lang="ts">
  import { createPlansStore } from "better-subscriptions/client/svelte";
  
  const { data: plans, isLoading, error } = createPlansStore(authClient);
</script>

{#if $isLoading}
  <p>Loading...</p>
{:else}
  {#each $plans as plan (plan.id)}
    <p>{plan.name}</p>
  {/each}
{/if}
```

**Features:**
- Native Svelte stores (Readable/Writable)
- Auto-fetch on creation
- Derived stores for reactivity
- Built-in error handling
- Manual refetch capabilities

---

## Framework Compatibility

| Framework | Type | Status | Location |
|-----------|------|--------|----------|
| React | Hooks | ✅ Complete | `src/client/react/` |
| Vue 3 | Composables | ✅ Complete | `src/client/vue/` |
| Svelte | Stores | ✅ Complete | `src/client/svelte/` |
| React Native | (Use React client) | ✅ Compatible | Same as React |
| Next.js | (Use React client) | ✅ Compatible | Same as React |
| Nuxt | (Use Vue client) | ✅ Compatible | Same as Vue |
| SvelteKit | (Use Svelte client) | ✅ Compatible | Same as Svelte |

---

## Common Features Across All Clients

### Manual Provider Support

All clients support the manual payment provider with:
- File upload to base64 encoding
- URL-based proof submission
- Developer-configurable metadata

```typescript
// React example
await subscribe({
  planId: "plan_manual",
  provider: "manual",
  manualProofUrl: "data:application/pdf;base64,...",
  manualMetadata: {
    reference: "INV-2024-001",
    bankAccount: "IBAN-123",
  }
});
```

### Error Handling

Each client provides error state:

**React:**
```typescript
const { error } = usePlans(authClient);
if (error) console.error(error.message);
```

**Vue:**
```typescript
const { error } = usePlans(authClient);
if (error.value) console.error(error.value.message);
```

**Svelte:**
```typescript
const { error } = createPlansStore(authClient);
if ($error) console.error($error.message);
```

### Loading States

All clients track request progress:

**React:**
```typescript
const { isLoading } = usePlans(authClient);
return isLoading ? <Spinner /> : <Content />;
```

**Vue:**
```typescript
const { isLoading } = usePlans(authClient);
return isLoading.value ? "Loading..." : "Done";
```

**Svelte:**
```typescript
const { isLoading } = createPlansStore(authClient);
{#if $isLoading}Loading...{/if}
```

### Refetch/Refresh

Manual data refresh available in all clients:

**React:**
```typescript
const { refetch } = usePlans(authClient);
<button onClick={refetch}>Refresh</button>
```

**Vue:**
```typescript
const { refetch } = usePlans(authClient);
<button @click="refetch">Refresh</button>
```

**Svelte:**
```typescript
const { refetch } = createPlansStore(authClient);
<button on:click={refetch}>Refresh</button>
```

---

## Setup Instructions

### Basic Setup (All Frameworks)

```typescript
// 1. Create auth client
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client/[react|vue|svelte]";

const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});

// 2. Export for use
export { authClient };
```

### React Setup

```typescript
// src/auth.ts
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});

// src/components/Plans.tsx
import { usePlans } from "better-subscriptions/client/react";
import { authClient } from "@/auth";

export function Plans() {
  const { data, isLoading, error } = usePlans(authClient);
  // ...
}
```

### Vue Setup

```typescript
// src/auth.ts
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});

// src/components/Plans.vue
<script setup lang="ts">
import { usePlans } from "better-subscriptions/client/vue";
import { authClient } from "@/auth";

const { data: plans } = usePlans(authClient);
</script>
```

### Svelte Setup

```typescript
// src/lib/auth.ts
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});

// src/routes/+page.svelte
<script lang="ts">
import { createPlansStore } from "better-subscriptions/client/svelte";
import { authClient } from "$lib/auth";

const { data: plans } = createPlansStore(authClient);
</script>
```

---

## TypeScript Support

All clients include full TypeScript definitions:

```typescript
import type { Plan, Subscription } from "better-subscriptions/types";

// React
const plans: Plan[] = data;
const sub: Subscription = subscription;

// Vue / Svelte - Same typing
```

---

## API Reference Quick Links

- **React**: See `src/client/react/` and `src/client/react/example.tsx`
- **Vue**: See `src/client/vue/` and `src/client/vue/examples.vue`
- **Svelte**: See `src/client/svelte/` and `src/client/svelte/examples.svelte`

Each client directory includes:
- `index.ts` - Core implementation
- `plugin.ts` - Better Auth plugin registration
- `README.md` - Detailed documentation
- `examples.[tsx|vue|svelte]` - Working code examples

---

## Advanced Usage

### Request Interception

For custom request handling, modify the auth client before creating stores:

```typescript
// React example
const customAuthClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
  // Add custom fetch interceptor here
  fetchOptions: {
    headers: {
      "X-Custom-Header": "value",
    },
  },
});

const { data } = usePlans(customAuthClient);
```

### Error Recovery

Implement retry logic using refetch:

**React:**
```typescript
const { refetch, error } = usePlans(authClient);

const handleRetry = async () => {
  await refetch();
};
```

### Cache Management

Each composable/store maintains independent state. For cross-component caching:

**React:** Use context or state management library
**Vue:** Use provide/inject or Pinia
**Svelte:** Use custom store with writable

---

## Performance Tips

1. **Avoid recreating auth client** - Create once, reuse everywhere
2. **Use refetch sparingly** - Only when data needs refresh
3. **Leverage error states** - Don't refetch on every error
4. **Memoize/derive** - Combine related data queries
5. **Lazy load stores** - Create stores only when needed

---

## Browser Support

All clients require modern browsers supporting:
- Fetch API
- Promise
- Async/await
- Proxy (for reactive state)

Minimum versions:
- Chrome 51+
- Firefox 54+
- Safari 10.1+
- Edge 15+

---

## Testing

Each client can be tested by mocking the auth client:

```typescript
// Mock auth client
const mockAuthClient = {
  $fetch: async (path: string) => {
    if (path === "/subscriptions/plans") {
      return { plans: [{ id: "1", name: "Plan 1" }] };
    }
  },
};

// React test
const { data } = usePlans(mockAuthClient);
```

---

## Troubleshooting

### "Cannot find module" errors

Ensure `better-auth` and framework packages are installed:

```bash
npm install better-auth
npm install react react-dom  # for React
npm install vue@3            # for Vue
npm install svelte           # for Svelte
```

### Store not updating

Ensure stores are created at component top level, not in event handlers or callbacks.

### Manual provider file upload fails

Verify file size is under 10MB and format is supported (images, PDF, DOC, DOCX).

---

## License

Same as Better Auth
