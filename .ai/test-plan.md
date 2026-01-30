# Plan testów — Cook Mastery (MVP)

## 1. Wprowadzenie i cele testowania

Cook Mastery to webowa aplikacja edukacyjna (Astro + React) z backendem opartym o endpointy Astro (`src/pages/api/**`) oraz Supabase (Auth + DB). Celem testów jest zapewnienie, że kluczowe przepływy MVP działają poprawnie, bezpiecznie i stabilnie:

- **Autoryzacja i sesje**: rejestracja, logowanie (email lub username), wylogowanie, ochrona zasobów.
- **Learning**: przeglądanie treści (tutoriale i artykuły), filtrowanie, paginacja, widoki detali.
- **Progress**: oznaczanie ukończeń (idempotentnie), wyliczanie postępu, warunek awansu \(>= 85%\).
- **Cookbook**: prywatne linki do przepisów — CRUD, walidacje, paginacja, sortowanie.
- **Profile**: podgląd profilu, zmiana poziomu, panel postępu.
- **Jakość niefunkcjonalna**: UX, dostępność, odporność na błędy sieci/serwera, podstawy bezpieczeństwa.

## 2. Zakres testów

### 2.1. Elementy w zakresie (In scope)

#### UI (strony i komponenty)

- **Publiczne strony**:
  - `GET /` (Home)
  - `GET /learning`
  - `GET /tutorials/:id`
  - `GET /articles/:id`
  - `GET /login`
  - `GET /signup`
- **Strony chronione (wymagają sesji)**:
  - `GET /profile`
  - `GET /cookbook`
  - `GET /cookbook/new`
  - `GET /cookbook/:id`
- **Główne komponenty/obszary UI**:
  - Formularze auth (`AuthFormLogin`, `AuthFormSignup`)
  - Feed i filtry (`LearningView`, `FiltersBar`, `TypeFilter`, `LevelFilter`)
  - Karty treści (`ContentCard`, `NewBadge`)
  - Widoki detali tutoriali/artykułów (sekcje + CTA ukończenia)
  - Cookbook: list/create/detail/edit/delete
  - Profile: zmiana poziomu, ProgressPanel
  - Stany wspólne: `LoadingState`, `EmptyState`, `FullPageError`, `NotFoundState`, `PaginationControls`, toasty (`sonner`)

#### API (endpointy)

- **Auth**:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- **Tutorials**:
  - `GET /api/tutorials`
  - `GET /api/tutorials/:id`
  - `POST /api/tutorials/:id/complete`
- **Articles**:
  - `GET /api/articles`
  - `GET /api/articles/:id`
  - `POST /api/articles/:id/complete`
- **Profile**:
  - `PATCH /api/profile`
- **Progress**:
  - `GET /api/progress/summary`
- **Cookbook**:
  - `GET /api/cookbook`
  - `POST /api/cookbook`
  - `GET /api/cookbook/:id`
  - `PATCH /api/cookbook/:id`
  - `DELETE /api/cookbook/:id`

### 2.2. Poza zakresem (Out of scope) — dla MVP

- Zaawansowane funkcje konta (reset hasła, weryfikacja e-mail, usuwanie konta).
- Wyszukiwanie, tagi, rozbudowane rekomendacje (poza selekcją poziomu).
- Undo (unpass/unread), quizy/walidacja wiedzy.
- Narzędzia admin/CRUD dla treści (jeśli nieudostępnione w UI MVP).
- Integracje analityczne (o ile nie są zaimplementowane w kodzie).

## 3. Typy testów do przeprowadzenia

### 3.1. Testy statyczne (jako bramka jakości)

- **Lint**: `npm run lint` (ESLint + React/Astro + a11y).
- **Format**: `npm run format` (Prettier).
- **Type-check**: rekomendowane dodanie komendy CI typu `npx astro check` (Astro/TS) oraz `tsc --noEmit` (jeśli wymagane).

### 3.2. Testy jednostkowe (unit)

Zakres:
- funkcje pomocnicze (formatowanie dat, walidacje UUID/URL, mapowanie DTO→VM),
- logika serwisów (np. budowa zapytań, obsługa błędów) testowana na mockach Supabase,
- wspólne utilsy (`error-handler`).

Rekomendowane narzędzia:
- **Vitest** + TypeScript
- mocki: `vi.fn()` / `msw` (dla fetch) / mock klienta Supabase.

### 3.3. Testy komponentów (React component tests)

Zakres:
- formularze (walidacja klienta, stany błędów, disabled, aria),
- CTA ukończenia (stany submit/error/success),
- filtry i paginacja (w tym warunkowe renderowanie).

Rekomendowane narzędzia:
- **React Testing Library** + **Vitest**
- **@testing-library/user-event**
- testy dostępności: **jest-axe** (lub axe w Vitest).

### 3.4. Testy integracyjne (API / serwisy / kontrakty)

Zakres:
- walidacje Zod dla query/body/path,
- kody statusów, kształt odpowiedzi (DTO),
- reguły cache (`Cache-Control`) zależne od autoryzacji,
- idempotencja endpointów `/complete`,
- uprawnienia (401 dla zasobów chronionych).

Rekomendowane narzędzia:
- Vitest (uruchamianie handlerów jako funkcji) lub testy HTTP na środowisku testowym.

### 3.5. Testy end-to-end (E2E)

Zakres:
- krytyczne ścieżki biznesowe w przeglądarce, z prawdziwą sesją cookie.

Rekomendowane narzędzie:
- **Playwright** (Chromium/Firefox/WebKit), z opcjonalnym **@axe-core/playwright**.

### 3.6. Testy niefunkcjonalne

- **Dostępność (a11y)**: podstawowe WCAG 2.1 AA (nawigacja klawiaturą, focus, aria, kontrast).
- **Bezpieczeństwo (baseline)**:
  - ochrona zasobów (redirecty/401),
  - brak wycieków informacji o istnieniu konta (enumeracja),
  - odporność na wstrzyknięcia w polach użytkownika (notes/title/username),
  - kontrola cache dla danych zależnych od użytkownika,
  - podstawowy przegląd nagłówków i cookies.
- **Wydajność (baseline)**: Lighthouse (performance + best practices), czasy ładowania list/detali w typowych warunkach.
- **Kompatybilność**: responsywność (mobile/tablet/desktop) i cross-browser dla podstawowych przepływów.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Autentykacja i sesje

#### Rejestracja — `POST /api/auth/signup` + UI `/signup`

- **Pozytywne**
  - Utworzenie konta dla poprawnych danych: email, username, hasło \(>= 8\), poziom.
  - Po rejestracji: użytkownik jest zalogowany (sesja cookie) i trafia na stronę główną.
- **Walidacje (400)**
  - brak email / niepoprawny email,
  - username < 3 / > 20 / niedozwolone znaki,
  - hasło < 8,
  - brak `selected_level` lub niepoprawna wartość.
  - Oczekiwanie: spójny format błędu `ApiErrorResponse` + wskazanie pól.
- **Konflikty (409)**
  - powtórne użycie istniejącego username,
  - email już zarejestrowany.
- **Bezpieczeństwo**
  - brak ujawniania nadmiarowych informacji w komunikatach (poza koniecznym dla UX),
  - próby wstrzyknięć w `username` (XSS payloady) — oczekiwanie: traktowane jako tekst, brak wykonania skryptu.

#### Logowanie — `POST /api/auth/login` + UI `/login`

- **Pozytywne**
  - Logowanie przez email.
  - Logowanie przez username.
  - Po sukcesie: przekierowanie do `/`.
- **Negatywne (401)**
  - błędne hasło,
  - nieistniejący email/username.
  - Oczekiwanie: **identyczny, generyczny komunikat** „Invalid credentials” (ochrona przed enumeracją).
- **Walidacje (400)**
  - brak identifier,
  - brak hasła.
- **Odporność**
  - błędy sieci/5xx: UI pokazuje sensowny komunikat.

#### Wylogowanie — `POST /api/auth/logout` (Navbar formularz + Profile fetch)

- Wylogowanie z Navbar (submit formularza):
  - sesja jest czyszczona,
  - przekierowanie do `/` i UI pokazuje linki „Log in / Sign up”.
- Wylogowanie z Profile (fetch):
  - niezależnie od redirectów po stronie endpointu, UI kończy sesję i przenosi użytkownika do `/login`.
- Scenariusze negatywne:
  - błąd 5xx → komunikat błędu w UI (Profile) / brak „zawieszenia” UI.

### 4.2. Middleware i kontrola dostępu (route guards)

- Użytkownik niezalogowany:
  - wejście na `/profile` → redirect do `/login`,
  - wejście na `/cookbook`/`/cookbook/new`/`/cookbook/:id` → redirect do `/login`.
- Użytkownik zalogowany:
  - wejście na `/login` i `/signup` → redirect do `/`.
- Scenariusz krawędziowy:
  - istnieje `user` w sesji, ale brak rekordu `profile` → brak możliwości wejścia na strony wymagające profilu; brak pętli redirectów.

### 4.3. Learning — przeglądanie, filtrowanie, paginacja

#### UI `/learning` + hook `useLearningFeed`

- **Domyślne ustawienia**
  - Anonymous: `level=ALL`, `type=all`.
  - Authenticated: `level = selected_level`, `type=all`.
- **Filtry**
  - Type: All / Tutorials / Articles — odświeża listę i resetuje stronę na 1.
  - Level: All / Beginner / Intermediate / Experienced — odświeża listę i resetuje stronę na 1.
  - Dla zalogowanego: ostrzeżenie „Browsing other levels (not recommended)” przy wyborze poziomu innego niż `selected_level`.
- **Paginacja**
  - Pojawia się tylko gdy `totalItems > 0`.
  - Przyciski Prev/Next mają poprawne disabled na granicach.
- **Stany**
  - Loading: skeletony.
  - Empty: brak wyników po filtrach.
  - Error: kontrolka retry działa.
- **Odporność**
  - szybkie zmiany filtrów nie powodują „wyścigów” (AbortController), nie ma błędów w konsoli.

#### API listujące

- `GET /api/tutorials`:
  - walidacje `level/category/sort/page/limit/include_completed`,
  - cache: `public, max-age=600` dla anonymous; `private, no-cache` dla authed.
- `GET /api/articles`:
  - walidacje `level/sort/page/limit/include_completed`,
  - cache: analogicznie jak wyżej.

### 4.4. Tutorial detail — `/tutorials/:id`

#### API `GET /api/tutorials/:id`

- Poprawny UUID:
  - 200 + komplet pól (w tym `steps`, `practice_recommendations`, `key_takeaways`).
  - cache: anonymous `public, max-age=300, stale-while-revalidate=600`, authed `private, no-cache`.
- Niepoprawny UUID:
  - 400 z błędem walidacji.
- Nieistniejący zasób:
  - 404 NOT_FOUND.

#### UI (TutorialDetailView)

- Niepoprawny ID (client-side UUID check) → stan NotFound bez callowania API.
- 404/400 → NotFound.
- Error 5xx / network → FullPageError + Retry.
- Renderowanie sekcji:
  - Summary, Content,
  - Steps: lista kroków posortowana po `order`, a gdy pusta — komunikat „No specific steps…”
  - Practice Recommendations, Key Takeaways.

#### Ukończenie tutoriala — `POST /api/tutorials/:id/complete` + CTA

- Zalogowany:
  - pierwsze kliknięcie → 201, toast sukcesu, CTA przechodzi w stan „Passed” i blokuje przycisk,
  - kolejne kliknięcia → 200 (idempotent) bez regresji UI.
- Niezalogowany:
  - CTA nie jest renderowane; bezpośredni request do API → 401.
- 404: tutorial usunięty → komunikat inline.
- 429/5xx: toast błędu + przycisk nadal możliwy do ponowienia.

### 4.5. Article detail — `/articles/:id`

Analogicznie do tutoriali, z różnicami:
- API `GET /api/articles/:id` nie ma `steps`, ale ma `key_takeaways`.
- CTA kończy się stanem „Read” oraz endpointem `POST /api/articles/:id/complete`.

### 4.6. Profile — `/profile` + `PATCH /api/profile` + `/api/progress/summary`

#### UI ProfileView

- Dane konta:
  - username, email, current level, member since (formatowanie po stronie klienta — brak błędów hydration).
- Zmiana poziomu:
  - po zmianie wyboru: przycisk „Save level” aktywny,
  - bez zmian: „Save level” disabled,
  - sukces: toast „Level updated” i stan lokalny się synchronizuje.
- Obsługa błędów:
  - 400 z `details.selected_level` → inline komunikat,
  - 401 → redirect do `/login`,
  - 429/5xx → toast błędu.

#### API `PATCH /api/profile`

- Walidacje:
  - brak pól → 400 + błąd ogólny,
  - `selected_level` spoza enum → 400,
  - poprawna aktualizacja `selected_level` → 200 i DTO profilu.
- Uprawnienia:
  - brak sesji → 401.
- Cache:
  - `private, no-cache`.

#### Progress — `GET /api/progress/summary` + ProgressPanel

- Zalogowany:
  - 200 i pola: `selected_level`, `level_progress[]`, `can_advance`.
  - `level_progress` zawiera wszystkie poziomy (również z 0).
- UI:
  - Loading → skeleton,
  - Empty state, gdy `totalCount=0` dla wybranego poziomu,
  - poprawne wyświetlenie % i liczników,
  - status Up to date / Out of date,
  - Eligibility: \(>=85%\) i poziom != EXPERIENCED.
- Niezalogowany:
  - 401 → redirect do `/login`.

### 4.7. Cookbook — `/cookbook` + CRUD

#### Lista — UI `/cookbook` + `GET /api/cookbook`

- Zalogowany:
  - lista ładuje się poprawnie,
  - sortowanie: newest / oldest / title (A–Z),
  - paginacja działa i ma stabilne wyniki między stronami.
- Stany:
  - empty state bez wpisów,
  - błąd 5xx/network: FullPageError + Retry.
- Niezalogowany:
  - redirect do `/login` (route) oraz 401 (API).

#### Tworzenie — UI `/cookbook/new` + `POST /api/cookbook`

- Walidacja UI:
  - URL wymagany i poprawny http/https,
  - title wymagany,
  - notes opcjonalne.
- Sukces:
  - toast „Cookbook entry saved”,
  - redirect do `/cookbook/:id`.
- Błędy:
  - 400 z detalami pól → inline,
  - 401 → redirect do `/login`,
  - network → toast.

#### Szczegóły / edycja — UI `/cookbook/:id` + `GET/PATCH/DELETE /api/cookbook/:id`

- GET:
  - poprawny UUID i wpis własny użytkownika → 200,
  - brak wpisu / cudzy wpis → 404,
  - niepoprawny UUID → 400.
- PATCH:
  - edycja tylko zmienionych pól,
  - próba zapisu bez zmian → komunikat „No changes to save.”,
  - walidacje: URL poprawny, title niepusty,
  - 401 → redirect do `/login`,
  - 404 → redirect do `/cookbook` z toastem „Entry not found”.
- DELETE:
  - confirm dialog,
  - po sukcesie redirect do `/cookbook` i toast,
  - 404 → redirect do listy z toastem,
  - 401 → redirect do `/login`.

#### Bezpieczeństwo danych cookbook

- Weryfikacja izolacji danych:
  - użytkownik A nie widzi / nie edytuje / nie usuwa wpisów użytkownika B (API i UI).

## 5. Środowisko testowe

### 5.1. Lokalne (dev)

- OS: Windows 10/11 (jak u zespołu), przeglądarki: Chrome/Edge (min.), Firefox (rekomendowane).
- Node.js: **22.14.0**.
- Uruchomienie: `npm install`, `npm run dev`.
- Wymagane zmienne środowiskowe:
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (anon)
  - `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer)
  - `PROD` (wpływa na secure cookies).

### 5.2. Środowisko testowe/staging (rekomendowane)

- Oddzielny projekt Supabase (staging) z:
  - włączonym RLS,
  - testowymi danymi treści,
  - możliwością resetu danych (seed/fixture).

### 5.3. Dane testowe (minimum)

- **Użytkownicy**:
  - 1 konto na poziom (BEGINNER/INTERMEDIATE/EXPERIENCED),
  - 2 konta do testów izolacji cookbook (UserA, UserB).
- **Treści**:
  - tutoriale dla każdej kategorii (PRACTICAL/THEORETICAL/EQUIPMENT) i poziomu,
  - artykuły dla każdego poziomu,
  - część treści z `created_at` < 7 dni (weryfikacja badge „New”),
  - treści bez kroków (steps = []).
- **Cookbook**:
  - 0 wpisów (empty),
  - >= 25 wpisów (paginacja),
  - tytuły do testów sortowania (A/Z, znaki specjalne).

## 6. Narzędzia do testowania

### 6.1. Narzędzia rekomendowane do dodania (automatyzacja)

- **Playwright** — E2E (przeglądarki, cookies, redirecty).
- **Vitest** — unit + integracyjne + komponentowe.
- **React Testing Library** — testy komponentów.
- **MSW** — mockowanie `fetch` w testach UI (symulacja 401/404/429/5xx/network).
- **@axe-core/playwright** (lub odpowiednik) — a11y smoke.
- **Lighthouse** — baseline perf/seo/best practices.

### 6.2. Narzędzia wspierające (manual)

- DevTools (Network/Storage/Cookies).
- Inspekcja logów serwera (konsola).
- Narzędzie do testów API (np. Postman/Insomnia) — opcjonalnie.

## 7. Harmonogram testów (propozycja dla MVP)

> Harmonogram należy dostosować do sprintów; poniżej szablon.

- **Tydzień 1 — Smoke + kontrakty API**
  - Smoke testy manualne wszystkich stron
  - Podstawowe testy API (happy path + walidacje)
- **Tydzień 2 — E2E krytycznych ścieżek**
  - Signup/Login/Logout
  - Mark tutorial/article complete
  - Cookbook CRUD
  - Profile update + progress summary
- **Tydzień 3 — Stabilizacja + regresja + a11y/perf baseline**
  - Regresja po poprawkach
  - a11y smoke
  - Lighthouse baseline i poprawki krytyczne

## 8. Kryteria akceptacji testów

- **Krytyczne funkcje (P0)** przechodzą w 100%:
  - Auth (signup/login/logout),
  - ochrona zasobów (middleware + 401),
  - completion endpoints (idempotencja),
  - cookbook CRUD i izolacja danych,
  - progress summary + aktualizacja poziomu.
- **Brak błędów klasy P0/P1** przed wydaniem.
- **Brak regresji kontraktów API** (format błędów, kody statusów, podstawowe pola DTO).
- **A11y smoke**: brak krytycznych problemów (nawigacja klawiaturą, focus, aria dla przycisków/stanów).
- **Cache-control**: brak cache’owania odpowiedzi zależnych od użytkownika.

## 9. Role i odpowiedzialności

- **QA**
  - przygotowanie i utrzymanie przypadków testowych,
  - wykonywanie testów manualnych i automatycznych,
  - raportowanie i weryfikacja poprawek,
  - utrzymanie danych testowych/staging (we współpracy z dev).
- **Developer**
  - naprawa błędów,
  - doposażenie projektu w test runner (Playwright/Vitest),
  - zapewnienie testowalności (stabilne selektory, przewidywalne odpowiedzi).
- **Product/Owner**
  - priorytetyzacja defektów,
  - akceptacja kryteriów „Definition of Done” dla releasu MVP.

## 10. Procedury raportowania błędów

### 10.1. Minimalny standard zgłoszenia (Issue)

- **Tytuł**: krótki, jednoznaczny (np. „Cookbook: 401 nie przekierowuje do /login po wygaśnięciu sesji”).
- **Środowisko**: lokalne/staging, przeglądarka + wersja, OS.
- **Kroki odtworzenia** (numerowane).
- **Oczekiwany rezultat** vs **rzeczywisty rezultat**.
- **Dowody**:
  - screenshot/krótki film,
  - logi konsoli,
  - eksport z Network (HAR) dla błędów API,
  - response body + status code.
- **Priorytet / Severity**:
  - P0 (blokuje krytyczną ścieżkę), P1, P2, P3.

### 10.2. Triaging i workflow

- QA weryfikuje powtarzalność i minimalizuje kroki.
- Dev określa root-cause i estymację.
- Po fixie: QA wykonuje retest + szybka regresja obszaru powiązanego.

