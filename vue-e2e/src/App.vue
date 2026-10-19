<script setup>
import { computed, ref } from "vue";
import { authClient } from "./auth-client.js";
import { usePlans } from "better-subscriptions/client/vue";
import AccountPanels from "./AccountPanels.vue";

const sessionState = authClient.useSession();
const {
  data: plans,
  isLoading: plansLoading,
  error: plansError,
  refetch: refetchPlans,
} = usePlans(authClient);

const session = computed(() => sessionState.value.data);
const user = computed(() => session.value?.user ?? null);

const email = ref("user@e2e.test");
const password = ref("User1234!");
const name = ref("Vue User");
const authError = ref("");
const authBusy = ref(false);

async function refreshSession() {
  await sessionState.value.refetch();
  await refetchPlans();
}

async function signIn() {
  authError.value = "";
  authBusy.value = true;
  try {
    const { error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });
    if (error) {
      authError.value = error.message ?? "Connexion impossible";
      return;
    }
    await refreshSession();
  } finally {
    authBusy.value = false;
  }
}

async function signUp() {
  authError.value = "";
  authBusy.value = true;
  try {
    const { error } = await authClient.signUp.email({
      email: email.value,
      password: password.value,
      name: name.value,
    });
    if (error) {
      authError.value = error.message ?? "Inscription impossible";
      return;
    }
    await refreshSession();
  } finally {
    authBusy.value = false;
  }
}

async function signOut() {
  await authClient.signOut();
  await refreshSession();
}

function useAdminCredentials() {
  email.value = "admin@e2e.test";
  password.value = "Admin123!";
}
</script>

<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">better-subscriptions · Vue 3 E2E</p>
        <h1>Gestion d'abonnements</h1>
        <p class="muted">
          App Vue consommant le package publié via
          <code>better-subscriptions/client/vue</code>.
        </p>
      </div>
      <div class="session" data-testid="session-status">
        <template v-if="session?.user">
          <span data-testid="session-email">{{ session.user.email }}</span>
          <span class="badge" data-testid="session-role">{{ session.user.role }}</span>
          <button class="btn ghost" data-testid="signout" @click="signOut">Déconnexion</button>
        </template>
        <span v-else>non connecté</span>
      </div>
    </header>

    <main class="stack">
      <section v-if="!session?.user" class="card" data-testid="auth-card">
        <h2>Connexion / inscription</h2>
        <p class="muted">
          Admin pré-créé : <code>admin@e2e.test</code> / <code>Admin123!</code>
        </p>
        <div class="grid two">
          <div class="subcard">
            <h3>Se connecter</h3>
            <label>Email<input v-model="email" data-testid="auth-email" /></label>
            <label>Mot de passe<input v-model="password" type="password" data-testid="auth-password" /></label>
            <div class="row">
              <button class="btn" data-testid="signin" :disabled="authBusy" @click="signIn">Connexion</button>
              <button class="btn ghost" data-testid="fill-admin" @click="useAdminCredentials">Compte admin</button>
            </div>
          </div>
          <div class="subcard">
            <h3>Créer un compte</h3>
            <label>Nom<input v-model="name" data-testid="signup-name" /></label>
            <label>Email<input v-model="email" data-testid="signup-email" /></label>
            <label>Mot de passe<input v-model="password" type="password" data-testid="signup-password" /></label>
            <button class="btn" data-testid="signup" :disabled="authBusy" @click="signUp">Créer le compte</button>
          </div>
        </div>
        <p v-if="authError" class="error" data-testid="auth-error">{{ authError }}</p>
      </section>

      <section class="card" data-testid="plans-card">
        <div class="row between">
          <h2>Catalogue public</h2>
          <button class="btn ghost" data-testid="refresh-plans" @click="refetchPlans()">Rafraîchir</button>
        </div>
        <p v-if="plansError" class="error">{{ plansError.message }}</p>
        <p v-if="plansLoading">Chargement…</p>
        <div v-else class="grid three">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="plan"
            :data-testid="`plan-${plan.slug}`"
          >
            <h3>{{ plan.name }} <span class="badge">{{ plan.kind }}</span></h3>
            <p class="muted mono">{{ plan.id }}</p>
            <ul>
              <li v-for="price in plan.prices" :key="`${price.provider}-${price.interval}`">
                {{ price.amountCents / 100 }} {{ price.currency }} / {{ price.interval }}
              </li>
            </ul>
            <ul class="advantages">
              <li v-for="advantage in plan.advantages" :key="advantage.advantageId">
                <code>{{ advantage.advantage?.key }}</code> = <strong>{{ advantage.value }}</strong>
                <span v-if="advantage.overageAllowed" class="badge">overage</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <AccountPanels
        v-if="user"
        :user="user"
        :plans="plans"
        @changed="refreshSession"
      />
    </main>
  </div>
</template>
