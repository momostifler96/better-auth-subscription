<!--
  Examples of Vue.js components using the subscriptions plugin composables.
-->

<script setup lang="ts">
import { ref } from "vue";
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client/vue";
import {
  usePlans,
  useMySubscription,
  useSubscribe,
  useChangePlan,
  useCancelSubscription,
  useValidatePromoCode,
  useRecordUsage,
} from "better-subscriptions/client/vue";

// Setup auth client
const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});
</script>

<!-- ============================================================================ -->
<!-- List Plans Component -->
<!-- ============================================================================ -->

<template>
  <div class="plans-page">
    <h1>Available Plans</h1>

    <div v-if="plansLoading" class="loading">Loading plans...</div>
    <div v-else-if="plansError" class="error">
      Error: {{ plansError.message }}
    </div>
    <div v-else class="plans-grid">
      <div v-for="plan in plans" :key="plan.id" class="plan-card">
        <h2>{{ plan.name }}</h2>
        <p>{{ plan.description }}</p>
        <PlanCard :plan="plan" :authClient="authClient" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: plans, isLoading: plansLoading, error: plansError } = usePlans(
  authClient
);
</script>

<!-- ============================================================================ -->
<!-- Plan Card Component (Subscribe) -->
<!-- ============================================================================ -->

<template>
  <div class="plan-card">
    <button
      @click="handleSubscribe"
      :disabled="subscribeLoading"
      class="btn-subscribe"
    >
      {{ subscribeLoading ? "Subscribing..." : "Subscribe" }}
    </button>
    <div v-if="subscribeError" class="error">
      {{ subscribeError.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  plan: any;
  authClient: any;
}

const props = defineProps<Props>();

const { subscribe, isLoading: subscribeLoading, error: subscribeError } =
  useSubscribe(props.authClient);

const handleSubscribe = async () => {
  try {
    await subscribe({
      planId: props.plan.id,
      provider: "stripe", // or 'manual' with proof
    });
    alert("Subscription successful!");
  } catch (err) {
    // Error is handled by the composable
  }
};
</script>

<!-- ============================================================================ -->
<!-- My Subscription Component -->
<!-- ============================================================================ -->

<template>
  <div class="my-subscription-page">
    <h1>My Subscription</h1>

    <div v-if="subLoading" class="loading">Loading...</div>
    <div v-else-if="subError" class="error">
      Error: {{ subError.message }}
    </div>
    <div v-else-if="!subscription">
      <p>No active subscription</p>
      <router-link to="/plans">Browse plans</router-link>
    </div>
    <div v-else class="subscription-detail">
      <div class="subscription-info">
        <p><strong>Plan:</strong> {{ subscription.planId }}</p>
        <p><strong>Status:</strong> {{ subscription.status }}</p>
        <p>
          <strong>Period:</strong>
          {{ new Date(subscription.currentPeriodStart).toLocaleDateString() }}
          -
          {{ new Date(subscription.currentPeriodEnd).toLocaleDateString() }}
        </p>
      </div>

      <div class="advantages">
        <h2>Your Advantages</h2>
        <ul>
          <li v-for="adv in advantages" :key="adv.advantage.id">
            <strong>{{ adv.advantage.name }}</strong>
            <span v-if="adv.value !== null">: {{ adv.value }}</span>
          </li>
        </ul>
      </div>

      <div class="actions">
        <button @click="handleChangePlan" :disabled="changePlanLoading">
          {{ changePlanLoading ? "Changing..." : "Change Plan" }}
        </button>
        <button
          @click="handleCancel"
          :disabled="cancelLoading"
          class="btn-danger"
        >
          {{ cancelLoading ? "Canceling..." : "Cancel Subscription" }}
        </button>
      </div>

      <div v-if="changePlanError" class="error">
        {{ changePlanError.message }}
      </div>
      <div v-if="cancelError" class="error">
        {{ cancelError.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  data: subData,
  subscription,
  advantages,
  isLoading: subLoading,
  error: subError,
  refetch: refetchSubscription,
} = useMySubscription(authClient);

const { changePlan, isLoading: changePlanLoading, error: changePlanError } =
  useChangePlan(authClient);
const { cancel, isLoading: cancelLoading, error: cancelError } =
  useCancelSubscription(authClient);

const handleChangePlan = async () => {
  const newPlanId = prompt("Enter new plan ID:");
  if (!newPlanId) return;

  try {
    await changePlan(subscription.value!.id, newPlanId);
    alert("Plan changed successfully!");
    await refetchSubscription();
  } catch (err) {
    // Error handled by composable
  }
};

const handleCancel = async () => {
  if (!confirm("Are you sure?")) return;

  try {
    await cancel(subscription.value!.id, true);
    alert("Subscription canceled!");
    await refetchSubscription();
  } catch (err) {
    // Error handled by composable
  }
};
</script>

<!-- ============================================================================ -->
<!-- Promo Code Validator -->
<!-- ============================================================================ -->

<template>
  <div class="promo-validator">
    <form @submit.prevent="handleValidate">
      <input
        v-model="promoCode"
        type="text"
        placeholder="Enter promo code"
        :disabled="validateLoading"
      />
      <button type="submit" :disabled="validateLoading">
        {{ validateLoading ? "Validating..." : "Validate" }}
      </button>
    </form>

    <div v-if="validateError" class="error">
      {{ validateError.message }}
    </div>
    <div v-if="promoData" class="success">
      Valid! Discount: {{ promoData.value }} {{ promoData.type }}
    </div>
  </div>
</template>

<script setup lang="ts">
const promoCode = ref("");
const { validate, data: promoData, isLoading: validateLoading, error: validateError } =
  useValidatePromoCode(authClient);

const handleValidate = async () => {
  try {
    await validate(promoCode.value);
  } catch (err) {
    // Error handled by composable
  }
};
</script>

<!-- ============================================================================ -->
<!-- Record Usage Component -->
<!-- ============================================================================ -->

<template>
  <div class="record-usage">
    <h2>Record Usage</h2>

    <div v-for="adv in advantages" :key="adv.advantage.id" class="advantage-row">
      <h3>{{ adv.advantage.name }}</h3>
      <p v-if="adv.advantage.valueType === 'quantity'">
        <label>
          Quantity:
          <input
            v-model.number="quantities[adv.advantage.key]"
            type="number"
            min="1"
            :disabled="recordLoading"
          />
        </label>
        <button
          @click="() => handleRecord(adv.advantage.key)"
          :disabled="recordLoading"
        >
          {{ recordLoading ? "Recording..." : "Record" }}
        </button>
      </p>
    </div>

    <div v-if="recordError" class="error">
      {{ recordError.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
const quantities = ref<Record<string, number>>({});
const { subscription, advantages } = useMySubscription(authClient);
const { record, isLoading: recordLoading, error: recordError } = useRecordUsage(
  authClient
);

const handleRecord = async (advantageKey: string) => {
  try {
    await record(
      subscription.value!.id,
      advantageKey,
      quantities.value[advantageKey] || 1
    );
    alert("Usage recorded!");
  } catch (err) {
    // Error handled by composable
  }
};
</script>

<!-- ============================================================================ -->
<!-- Styles (add to your global CSS) -->
<!-- ============================================================================ -->

<style scoped>
.plans-page,
.my-subscription-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.plan-card,
.subscription-detail {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.plan-card h2,
.subscription-detail h2 {
  margin-top: 0;
  color: #111827;
}

.btn-subscribe,
.btn-danger,
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-subscribe {
  background: #3b82f6;
  color: white;
}

.btn-subscribe:hover:not(:disabled) {
  background: #2563eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.error {
  color: #991b1b;
  background: #fee2e2;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.success {
  color: #166534;
  background: #dcfce7;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.advantages {
  margin: 1.5rem 0;
}

.advantages ul {
  list-style: none;
  padding: 0;
}

.advantages li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.subscription-info {
  margin-bottom: 1.5rem;
}

.subscription-info p {
  margin: 0.5rem 0;
}
</style>
