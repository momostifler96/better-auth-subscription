<script setup>
import { onMounted, ref } from "vue";
import { authClient } from "./auth-client.js";

const emit = defineEmits(["changed"]);

const pending = ref([]);
const audits = ref([]);
const pendingError = ref("");
const auditError = ref("");
const busy = ref(false);

function unwrap(response) {
  if (response.error) {
    throw new Error(response.error.message ?? `HTTP ${response.error.status ?? "?"}`);
  }
  return response.data;
}

async function loadPending() {
  pendingError.value = "";
  try {
    const data = unwrap(await authClient.subscriptions.listPendingSubscriptions());
    pending.value = data.subscriptions ?? [];
  } catch (error) {
    pendingError.value = error.message ?? String(error);
  }
}

async function loadAudits() {
  auditError.value = "";
  try {
    const data = unwrap(await authClient.subscriptions.listAuditLogs({}));
    audits.value = data.logs ?? [];
  } catch (error) {
    auditError.value = error.message ?? String(error);
  }
}

async function approve(id) {
  busy.value = true;
  try {
    unwrap(await authClient.subscriptions.approveSubscription(id));
    await loadPending();
    await loadAudits();
    emit("changed");
  } catch (error) {
    pendingError.value = error.message ?? String(error);
  } finally {
    busy.value = false;
  }
}

async function reject(id) {
  busy.value = true;
  try {
    unwrap(await authClient.subscriptions.rejectSubscription(id, { reason: "Refusé depuis Vue E2E" }));
    await loadPending();
    await loadAudits();
    emit("changed");
  } catch (error) {
    pendingError.value = error.message ?? String(error);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadPending(), loadAudits()]);
});
</script>

<template>
  <div class="subcard admin" data-testid="admin-card">
    <div class="row between">
      <h3>Administration</h3>
      <span class="badge" data-testid="pending-count">{{ pending.length }} en attente</span>
    </div>

    <p v-if="pendingError" class="error" data-testid="pending-error">{{ pendingError }}</p>
    <p v-if="pending.length === 0" class="muted" data-testid="pending-empty">
      Aucune souscription manuelle en attente.
    </p>
    <ul v-else class="list" data-testid="pending-list">
      <li v-for="subscription in pending" :key="subscription.id">
        <div>
          <code>{{ subscription.id }}</code>
          <p class="muted small">
            user {{ subscription.userId }} · plan {{ subscription.planId }} · {{ subscription.provider }}
          </p>
        </div>
        <div class="row">
          <button class="btn" :data-testid="`approve-${subscription.id}`" :disabled="busy" @click="approve(subscription.id)">
            Approuver
          </button>
          <button class="btn danger" :data-testid="`reject-${subscription.id}`" :disabled="busy" @click="reject(subscription.id)">
            Rejeter
          </button>
        </div>
      </li>
    </ul>

    <div class="row between">
      <h4>Journal d'audit</h4>
      <button class="btn ghost" data-testid="refresh-audit" @click="loadAudits">Rafraîchir</button>
    </div>
    <p v-if="auditError" class="error" data-testid="audit-error">{{ auditError }}</p>
    <ul class="audit" data-testid="audit-list">
      <li v-for="entry in audits" :key="entry.id">
        <code>{{ entry.action }}</code>
        <span class="muted">{{ entry.actorType }}:{{ entry.actorId }}</span>
      </li>
    </ul>
    <p class="muted" data-testid="audit-count">{{ audits.length }} entrée(s)</p>
  </div>
</template>
