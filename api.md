# MicroZap API Documentation

## Übersicht

Diese API ermöglicht die Verwaltung von Benutzerkonten, Zahlungen und Artikelfreischaltungen in der MicroZap-Anwendung. Die API basiert auf Express.js und verwendet JWT für die Authentifizierung sowie Lightning Network Zahlungen über LNBits.

**Base URL:** `http://localhost:3001` (Standard-Port)

**Authentifizierung:** JWT-Token über HTTP-Only Cookies

## Authentifizierungs-Endpunkte

### GET /lnurl-auth

Generiert eine LNURL für die Authentifizierung über Lightning Network.

**Antwort:**

```json
{
  "qrCode": "data:image/png;base64,...",
  "url": "lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns",
  "k1": "abc123..."
}
```

### GET /login-status/:k1

Überprüft den Status einer Authentifizierungsanfrage.

**Parameter:**

- `k1` (path): Der geheime Schlüssel aus der LNURL-Authentifizierung

**Antwort:**

```json
{
  "status": "success|pending|failed"
}
```

### POST /paidArticles

Speichert bezahlte Artikel für einen authentifizierten Benutzer.

**Authentifizierung:** Erforderlich (JWT-Token)

**Request Body:**

```json
{
  "paidArticles": [
    {
      "id": "article-1",
      "title": "Artikel Titel"
    }
  ]
}
```

**Antwort:**

```json
{
  "paidArticles": [...]
}
```

### POST /logout

Meldet einen Benutzer ab und entfernt das Authentifizierungs-Cookie.

**Authentifizierung:** Erforderlich (JWT-Token)

**Antwort:**

```json
{
  "success": true
}
```

### GET /auth/status

Überprüft den Authentifizierungsstatus des aktuellen Benutzers.

**Antwort:**

```json
{
  "isAuthenticated": true|false
}
```

### GET /user-info

Ruft Benutzerinformationen und Premium-Status ab.

**Authentifizierung:** Erforderlich (JWT-Token)

**Antwort:**

```json
{
  "walletId": "user-wallet-id",
  "status": "premium|free",
  "premiumStart": "2025-01-01T00:00:00.000Z",
  "premiumEnd": "2025-01-31T00:00:00.000Z"
}
```

### POST /delete-account

Löscht das Benutzerkonto und alle zugehörigen Daten.

**Authentifizierung:** Erforderlich (JWT-Token)

**Antwort:**

```json
{
  "success": true
}
```

## Zahlungs-Endpunkte

### GET /get-price

Ruft den Preis für einen Artikel oder Premium-Zugang ab.

**Query Parameter:**

- `articleId` (optional): ID des Artikels für Einzelzahlung

**Antwort:**

```json
{
  "amount": 1000
}
```

### POST /create-invoice

Erstellt eine Lightning-Rechnung für Zahlungen.

**Request Body:**

```json
{
  "type": "premium|article",
  "articleId": "article-id" // nur bei type: "article"
}
```

**Antwort:**

```json
{
  "paymentRequest": "lnbc10n1...",
  "paymentHash": "abc123...",
  "qrCode": "data:image/png;base64,..."
}
```

**Fehler:**

```json
{
  "error": "Fehler beim Erstellen der Rechnung: [Fehlermeldung]"
}
```

### GET /check-payment/:hash

Überprüft den Status einer Zahlung.

**Parameter:**

- `hash` (path): Payment Hash der Rechnung

**Query Parameter:**

- `type` (optional): "premium" für Premium-Käufe

**Authentifizierung:** Erforderlich bei Premium-Käufen

**Antwort:**

```json
{
  "paid": true|false
}
```

### POST /initiate-premium-refund

Initiiert eine Rückerstattung für Premium-Zugang (innerhalb 24h).

**Authentifizierung:** Erforderlich (JWT-Token)

**Antwort:**

```json
{
  "lnurl": "lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns",
  "qrCodeUrl": "data:image/png;base64,..."
}
```

### GET /check-withdraw-status

Überprüft den Status einer Rückerstattung.

**Authentifizierung:** Erforderlich (JWT-Token)

**Antwort:**

```json
{
  "withdrawn": true|false
}
```

## Zahlungsprüfungs-Endpunkte

### GET /check-payment/:hash (aus payments.js) - **AKTIV VERWENDET**

Dieser Endpunkt wird vom Frontend für alle Zahlungsprüfungen verwendet (Artikel- und Premium-Käufe).

**Verwendung im Frontend:**

- `PaymentComponent.jsx`: Für Artikelzahlungen ohne Query-Parameter
- `GetPremium.jsx`: Für Premium-Käufe mit `?type=premium`

**Parameter:**

- `hash` (path): Payment Hash der Rechnung

**Query Parameter:**

- `type` (optional): "premium" für Premium-Käufe

**Authentifizierung:** Erforderlich bei Premium-Käufen

**Antwort:**

```json
{
  "paid": true|false
}
```

### GET /check-payment/:paymentHash (aus checkPayment.js) - **NICHT VERWENDET**

Dieser Endpunkt existiert im Code aber wird nicht vom Frontend verwendet. Er bietet erweiterte Datenbank-Update-Funktionen ohne Authentifizierung.

**Parameter:**

- `paymentHash` (path): Payment Hash der Rechnung

**Query Parameter:**

- `userId` (optional): Benutzer-ID für Datenbank-Updates
- `type` (optional): "premium" oder "article"
- `articleId` (optional): Artikel-ID bei Einzelzahlungen

**Antwort:**

```json
{
  "paid": true|false
}
```

**Hinweis:** Nur der erste Endpunkt (`:hash`) wird aktiv vom Frontend verwendet. Der zweite Endpunkt (`:paymentHash`) scheint ungenutzt zu sein und könnte Legacy-Code oder für zukünftige Erweiterungen vorhanden sein.

## Fehlerbehandlung

Alle Endpunkte geben bei Fehlern entsprechende HTTP-Statuscodes zurück:

- `400`: Bad Request - Ungültige Parameter
- `401`: Unauthorized - Authentifizierung erforderlich/fehlgeschlagen
- `403`: Forbidden - Nicht autorisiert
- `404`: Not Found - Ressource nicht gefunden
- `500`: Internal Server Error - Serverfehler

Fehlermeldungen werden im JSON-Format zurückgegeben:

```json
{
  "error": "Beschreibung des Fehlers"
}
```

## Authentifizierung

Die API verwendet JWT-Token für die Authentifizierung. Token werden über HTTP-Only Cookies übertragen und haben eine Gültigkeitsdauer von 1 Stunde.

Für die Erstauthentifizierung wird LNURL verwendet:

1. `GET /lnurl-auth` aufrufen um QR-Code und URL zu erhalten
2. Benutzer scannt QR-Code oder öffnet URL in Lightning-Wallet
3. `GET /login-status/:k1` polling um Authentifizierung zu bestätigen
4. Bei Erfolg wird JWT-Token als Cookie gesetzt

## Datenbank

Die API verwendet SQLite für die Datenspeicherung mit folgenden Tabellen:

- `auth_requests`: LNURL-Authentifizierungsanfragen
- `users`: Benutzerdaten, Premium-Status, bezahlte Artikel
- `withdraw_secrets`: Rückerstattungsanfragen
