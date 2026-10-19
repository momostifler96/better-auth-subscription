<script setup>
import { computed, ref, watch } from "vue";
import { authClient } from "./auth-client.js";
import {
  useMySubscription,
  useSubscribe,
  useChangePlan,
  useCancelSubscription,
  useValidatePromoCode,
  useRecordUsage,
} from "better-subscriptions/client/vue";
import AdminPanel from "./AdminPanel.vue";

const props = defineProps({
  user: { type: Object, required: true },
  plans: { type: Array, default: () => [] },
});
const emit = defineEmits(["changed"]);

const mine = useMySubscription(authClient);
const subscribeApi = useSubscribe(authClient);
const changeApi = useChangePlan(authClient);
const cancelApi = useCancelSubscription(authClient);
const promoApi = useValidatePromoCode(authClient);
const usageApi = useRecordUsage(authClient);

const subscription = computed(() => mine.data.value?.subscription ?? null);
const advantages = computed(() => mine.data.value?.advantages ?? []);
const planName = computed(() => {
  const plan = props.plans.find((candidate) => candidate.id === subscription.value?.planId);
  return plan?.name ?? subscription.value?.planId ?? "—";
});

const planId = ref("");
const provider = ref("manual");
const promoCode = ref("VUE20");
const proofUrl = ref("https://example.test/receipt.jpg");
const quantity = ref(1);
const subscribeMessage = ref("");
const subscribeError = ref("");
const subscribeBusy = ref(false);

const newPlanId = ref("");
const cancelAtPeriodEnd = ref(true);
const actionMessage = ref("");
const actionError = ref("");

const validateCode = ref("VUE20");
const promoResult = ref(null);
const promoError = ref("");

const usageKey = ref("api_calls_per_month");
const usageQty = ref(900);
const usageResult = ref(null);
const usageError = ref("");

watch(
  () => props.plans,
  (plans) => {
    if (!planId.value && plans[0]) planId.value = plans[0].id;
    if (!newPlanId.value && plans[0]) newPlanId.value = plans[0].id;
  },
  { immediate: true },
);

async function subscribe() {
  subscribeMessage.value = "";
  subscribeError.value = "";
  subscribeBusy.value = true;
  try {
    const data = await subscribeApi.subscribe({
      planId: planId.value,
      provider: provider.value === "auto" ? undefined : provider.value,
      promoCode: promoCode.value || undefined,
      manualProofUrl: proofUrl.value || undefined,
      quantity: Number(quantity.value) || undefined,
    });
    subscribeMessage.value = `Souscription créée : ${data.status}`;
    await mine.refetch();
    emit("changed");
  } catch (error) {
    subscribeError.value = error.message ?? String(error);
  } finally {
    subscribeBusy.value = false;
  }
}

async function changePlan() {
  if (!subscription.value) return;
  actionMessage.value = "";
  actionError.value = "";
  try {
    const updated = await changeApi.changePlan(subscription.value.id, newPlanId.value);
    actionMessage.value = `Plan changé : ${updated.planId}`;
    await mine.refetch();
    emit("changed");
  } catch (error) {
    actionError.value = error.message ?? String(error);
  }
}

async function cancel() {
  if (!subscription.value) return;
  actionMessage.value = "";
  actionError.value = "";
  try {
    const updated = await cancelApi.cancel(
      subscription.value.id,
      cancelAtPeriodEnd.value,
    );
    actionMessage.value = `Souscription ${updated.status}`;
    await mine.refetch();
    emit("changed");
  } catch (error) {
    actionError.value = error.message ?? String(error);
  }
}

async function validatePromo() {
  promoResult.value = null;
  promoError.value = "";
  try {
    promoResult.value = await promoApi.validate(validateCode.value, planId.value);
  } catch (error) {
    promoError.value = error.message ?? String(error);
  }
}

async function recordUsage() {
  if (!subscription.value) return;
  usageResult.value = null;
  usageError.value = "";
  try {
    usageResult.value = await usageApi.record(
      subscription.value.id,
      usageKey.value,
      Number(usageQty.value),
    );
    emit("changed");
  } catch (error) {
    usageError.value = error.message ?? String(error);
  }
}
</script>

<template>
  <section class="card" data-testid="account-card">
    <div class="row between">
      <h2>Mon abonnement</h2>
      <button class="btn ghost" data-testid="refresh-subscription" @click="mine.refetch()">
        Rafraîchir
      </button>
    </div>

    <p v-if="mine.isLoading.value" class="muted">Chargement…</p>
    <p v-else-if="mine.error.value" class="error" data-testid="subscription-error">
      {{ mine.error.value.message }}
    </p>
    <p v-else-if="!subscription" class="muted" data-testid="no-subscription">
      Aucune souscription.
    </p>
    <div v-else class="subcard" data-testid="subscription-detail">
      <div class="row wrap">
        <span class="badge" :data-testid="`subscription-status-${subscription.status}`">
          {{ subscription.status }}
        </span>
        <strong data-testid="subscription-plan">{{ planName }}</strong>
        <span class="muted mono" data-testid="subscription-id">{{ subscription.id }}</span>
      </div>
      <p class="muted">
        Provider : <code>{{ subscription.provider }}</code>
        · Promo : <code>{{ subscription.appliedPromoCodeId ?? "—" }}</code>
      </p>
      <ul class="advantages" data-testid="subscription-advantages">
        <li v-for="advantage in advantages" :key="advantage.advantageId">
          <code>{{ advantage.advantage?.key }}</code> = <strong>{{ advantage.value }}</strong>
        </li>
      </ul>
      <p v-if="subscription.status === 'pending_approval'" class="warning" data-testid="pending-hint">
        En attente d'approbation admin : les avantages ne sont pas actifs.
      </p>
    </div>

    <div class="grid two">
      <div class="subcard">
        <h3>Souscrire</h3>
        <label>Plan
          <select v-model="planId" data-testid="subscribe-plan">
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">
              {{ plan.name }} ({{ plan.slug }})
            </option>
          </select>
        </label>
        <label>Provider
          <select v-model="provider" data-testid="subscribe-provider">
            <option value="manual">manual</option>
            <option value="auto">auto</option>
          </select>
        </label>
        <label>Code promo<input v-model="promoCode" data-testid="subscribe-promo" /></label>
        <label>Preuve de paiement<input v-model="proofUrl" data-testid="subscribe-proof" /></label>
        <label>Quantité<input v-model.number="quantity" type="number" min="1" data-testid="subscribe-quantity" /></label>
        <button class="btn" data-testid="subscribe" :disabled="subscribeBusy || !planId" @click="subscribe">
          Souscrire
        </button>
        <p v-if="subscribeMessage" class="success" data-testid="subscribe-message">{{ subscribeMessage }}</p>
        <p v-if="subscribeError" class="error" data-testid="subscribe-error">{{ subscribeError }}</p>
      </div>

      <div class="subcard">
        <h3>Changer de plan / annuler</h3>
        <label>Nouveau plan
          <select v-model="newPlanId" data-testid="change-plan-select">
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">
              {{ plan.name }} ({{ plan.slug }})
            </option>
          </select>
        </label>
        <button class="btn" data-testid="change-plan" :disabled="!subscription" @click="changePlan">
          Changer de plan
        </button>
        <label class="checkbox">
          <input v-model="cancelAtPeriodEnd" type="checkbox" data-testid="cancel-at-period-end" />
          Annuler à la fin de la période
        </label>
        <button class="btn danger" data-testid="cancel-subscription" :disabled="!subscription" @click="cancel">
          Annuler
        </button>
        <p v-if="actionMessage" class="success" data-testid="action-message">{{ actionMessage }}</p>
        <p v-if="actionError" class="error" data-testid="action-error">{{ actionError }}</p>
      </div>

      <div class="subcard">
        <h3>Valider un code promo</h3>
        <label>Code<input v-model="validateCode" data-testid="validate-code" /></label>
        <button class="btn" data-testid="validate-promo" @click="validatePromo">Valider</button>
        <pre v-if="promoResult" class="result" data-testid="promo-result">{{ JSON.stringify(promoResult, null, 2) }}</pre>
        <p v-if="promoError" class="error" data-testid="promo-error">{{ promoError }}</p>
      </div>

      <div class="subcard">
        <h3>Enregistrer une consommation</h3>
        <label>Avantage<input v-model="usageKey" data-testid="usage-key" /></label>
        <label>Quantité<input v-model.number="usageQty" type="number" min="0" data-testid="usage-quantity" /></label>
        <button class="btn" data-testid="record-usage" :disabled="!subscription" @click="recordUsage">
          Enregistrer
        </button>
        <pre v-if="usageResult" class="result" data-testid="usage-result">{{ JSON.stringify(usageResult, null, 2) }}</pre>
        <p v-if="usageError" class="error" data-testid="usage-error">{{ usageError }}</p>
      </div>
    </div>

    <AdminPanel v-if="user.role === 'admin'" @changed="mine.refetch()" />
  </section>
</template>
