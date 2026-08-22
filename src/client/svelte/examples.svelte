<!--
  Examples of Svelte components using the subscriptions plugin stores.
-->

<script lang="ts">
  import { createAuthClient } from "better-auth/client";
  import { subscriptionsPlugin } from "better-subscriptions/client/svelte";
  import {
    createPlansStore,
    createSubscriptionStore,
    createSubscribeStore,
    createChangePlanStore,
    createCancelSubscriptionStore,
    createValidatePromoCodeStore,
    createRecordUsageStore,
  } from "better-subscriptions/client/svelte";

  // Setup auth client
  const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [subscriptionsPlugin()],
  });
</script>

<!-- ============================================================================ -->
<!-- List Plans Component -->
<!-- ============================================================================ -->

<script>
  const { data: plans, isLoading, error } = createPlansStore(authClient);
</script>

<div class="plans-page">
  <h1>Available Plans</h1>

  {#if $isLoading}
    <div class="loading">Loading plans...</div>
  {:else if $error}
    <div class="error">Error: {$error.message}</div>
  {:else}
    <div class="plans-grid">
      {#each $plans || [] as plan (plan.id)}
        <PlanCard {plan} {authClient} />
      {/each}
    </div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- Plan Card Component (Subscribe) -->
<!-- ============================================================================ -->

<script lang="ts">
  interface Props {
    plan: any;
    authClient: any;
  }

  export let { plan, authClient }: Props;

  const { subscribe, isLoading: subscribeLoading, error: subscribeError } =
    createSubscribeStore(authClient);

  const handleSubscribe = async () => {
    try {
      await subscribe({
        planId: plan.id,
        provider: "stripe",
      });
      alert("Subscription successful!");
    } catch (err) {
      // Error is handled by the store
    }
  };
</script>

<div class="plan-card">
  <h2>{plan.name}</h2>
  <p>{plan.description}</p>
  <button on:click={handleSubscribe} disabled={$subscribeLoading}>
    {$subscribeLoading ? "Subscribing..." : "Subscribe"}
  </button>
  {#if $subscribeError}
    <div class="error">{$subscribeError.message}</div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- My Subscription Component -->
<!-- ============================================================================ -->

<script lang="ts">
  const {
    subscription,
    advantages,
    isLoading: subLoading,
    error: subError,
    refetch: refetchSubscription,
  } = createSubscriptionStore(authClient);

  const { changePlan, isLoading: changePlanLoading, error: changePlanError } =
    createChangePlanStore(authClient);
  const { cancel, isLoading: cancelLoading, error: cancelError } =
    createCancelSubscriptionStore(authClient);

  const handleChangePlan = async () => {
    const newPlanId = prompt("Enter new plan ID:");
    if (!newPlanId) return;

    try {
      await changePlan($subscription.id, newPlanId);
      alert("Plan changed successfully!");
      await refetchSubscription();
    } catch (err) {
      // Error handled by store
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure?")) return;

    try {
      await cancel($subscription.id, true);
      alert("Subscription canceled!");
      await refetchSubscription();
    } catch (err) {
      // Error handled by store
    }
  };
</script>

<div class="my-subscription-page">
  <h1>My Subscription</h1>

  {#if $subLoading}
    <div class="loading">Loading...</div>
  {:else if $subError}
    <div class="error">Error: {$subError.message}</div>
  {:else if !$subscription}
    <p>No active subscription</p>
    <a href="/plans">Browse plans</a>
  {:else}
    <div class="subscription-detail">
      <div class="subscription-info">
        <p><strong>Plan:</strong> {$subscription.planId}</p>
        <p><strong>Status:</strong> {$subscription.status}</p>
        <p>
          <strong>Period:</strong>
          {new Date($subscription.currentPeriodStart).toLocaleDateString()}
          -
          {new Date($subscription.currentPeriodEnd).toLocaleDateString()}
        </p>
      </div>

      <div class="advantages">
        <h2>Your Advantages</h2>
        <ul>
          {#each $advantages as adv (adv.advantage.id)}
            <li>
              <strong>{adv.advantage.name}</strong>
              {#if adv.value !== null}
                <span>: {adv.value}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      <div class="actions">
        <button on:click={handleChangePlan} disabled={$changePlanLoading}>
          {$changePlanLoading ? "Changing..." : "Change Plan"}
        </button>
        <button
          on:click={handleCancel}
          disabled={$cancelLoading}
          class="btn-danger"
        >
          {$cancelLoading ? "Canceling..." : "Cancel Subscription"}
        </button>
      </div>

      {#if $changePlanError}
        <div class="error">{$changePlanError.message}</div>
      {/if}
      {#if $cancelError}
        <div class="error">{$cancelError.message}</div>
      {/if}
    </div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- Promo Code Validator -->
<!-- ============================================================================ -->

<script lang="ts">
  let promoCode = "";

  const { validate, data: promoData, isLoading: validateLoading, error: validateError } =
    createValidatePromoCodeStore(authClient);

  const handleValidate = async () => {
    try {
      await validate(promoCode);
    } catch (err) {
      // Error handled by store
    }
  };
</script>

<div class="promo-validator">
  <form on:submit|preventDefault={handleValidate}>
    <input
      bind:value={promoCode}
      type="text"
      placeholder="Enter promo code"
      disabled={$validateLoading}
    />
    <button type="submit" disabled={$validateLoading}>
      {$validateLoading ? "Validating..." : "Validate"}
    </button>
  </form>

  {#if $validateError}
    <div class="error">{$validateError.message}</div>
  {/if}
  {#if $promoData}
    <div class="success">
      Valid! Discount: {$promoData.value} {$promoData.type}
    </div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- Record Usage Component -->
<!-- ============================================================================ -->

<script lang="ts">
  const quantities = {};

  const { subscription, advantages } = createSubscriptionStore(authClient);
  const { record, isLoading: recordLoading, error: recordError } = createRecordUsageStore(
    authClient
  );

  const handleRecord = async (advantageKey) => {
    try {
      await record($subscription.id, advantageKey, quantities[advantageKey] || 1);
      alert("Usage recorded!");
    } catch (err) {
      // Error handled by store
    }
  };
</script>

<div class="record-usage">
  <h2>Record Usage</h2>

  {#each $advantages as adv (adv.advantage.id)}
    <div class="advantage-row">
      <h3>{adv.advantage.name}</h3>
      {#if adv.advantage.valueType === "quantity"}
        <p>
          <label>
            Quantity:
            <input
              bind:value={quantities[adv.advantage.key]}
              type="number"
              min="1"
              disabled={$recordLoading}
            />
          </label>
          <button
            on:click={() => handleRecord(adv.advantage.key)}
            disabled={$recordLoading}
          >
            {$recordLoading ? "Recording..." : "Record"}
          </button>
        </p>
      {/if}
    </div>
  {/each}

  {#if $recordError}
    <div class="error">{$recordError.message}</div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- Styles -->
<!-- ============================================================================ -->

<style>
  :global(.plans-page),
  :global(.my-subscription-page) {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  :global(.plans-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  :global(.plan-card),
  :global(.subscription-detail) {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  :global(button) {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    background: #3b82f6;
    color: white;
  }

  :global(button:hover:not(:disabled)) {
    background: #2563eb;
  }

  :global(.btn-danger) {
    background: #ef4444;
  }

  :global(.btn-danger:hover:not(:disabled)) {
    background: #dc2626;
  }

  :global(button:disabled) {
    background: #9ca3af;
    cursor: not-allowed;
  }

  :global(.error) {
    color: #991b1b;
    background: #fee2e2;
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
  }

  :global(.success) {
    color: #166534;
    background: #dcfce7;
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
  }

  :global(.loading) {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  :global(.advantages ul) {
    list-style: none;
    padding: 0;
  }

  :global(.advantages li) {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.actions) {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
</style>
