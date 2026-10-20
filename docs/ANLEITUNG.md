# Time Entry: Installation und Bedienung

| Datum | Unterzeichnet von |
|:------|:------------------|
| 20.10.2026 | David |

---

## 1. Ausgangslage

*Time Entry* ist eine Firefox-Erweiterung zum Ein- und Ausstempeln mit einem Klick. Sie schreibt die Zeiten direkt in das eigene Blatt der gemeinsamen Zeitdatei `ArbeitszeitStempeln_Auto.xlsx`, genau dorthin, wo früher die Power-Automate-Flows geschrieben haben. Auf Wunsch schickt sie zusätzlich eine zufällige Nachricht in einen Teams-Chat, z. B. «David flitzt nach Hause».

Die Oberfläche der Erweiterung ist englisch. Knöpfe und Meldungen stehen deshalb in dieser Anleitung auf Englisch, z. B. **Log in** oder **Save**.

### 1.1 Voraussetzungen

- **Firefox 140** oder neuer
- Ein **Microsoft-Konto** der Schulen Unterägeri
- Zugriff auf die Zeitdatei in SharePoint:
  *ICT-Support und Animation - General › Projekte Lehrlinge › Arbeitszeiten_Lehrlinge › ArbeitszeitStempeln_Auto.xlsx*
- Die **Directory (tenant) ID** und die **Application (client) ID**. Beide gibt es bei Michael Iten. Sie stehen nicht im Repository.

---

## 2. Installation

### 2.1 Signierte Version (empfohlen)

1. Die Datei `time-entry-<version>.xpi` besorgen, entweder auf der GitHub-Seite unter **Releases** oder direkt bei David Seeliger.
2. Die Datei in ein Firefox-Fenster ziehen. Alternativ: Menü › **Add-ons and themes** › Zahnrad › **Install Add-on From File…**
3. Die Rückfrage bestätigen. Sie zeigt, was die Erweiterung braucht, unter anderem das Senden von Anmeldedaten an Microsoft.
4. Das Symbol von *Time Entry* (eine Uhr) erscheint in der Symbolleiste. Fehlt es, über das Puzzle-Symbol (Erweiterungen) anheften.

> **Erledigt:** Die signierte Version bleibt auch nach einem Neustart von Firefox installiert.

### 2.2 Entwicklerversion (ohne Signatur)

1. Das Repository herunterladen: **Code › Download ZIP**, dann entpacken.
2. In Firefox in die Adresszeile eingeben: `about:debugging#/runtime/this-firefox`
3. **Load Temporary Add-on…** anklicken und im entpackten Ordner die Datei `manifest.json` wählen.

> **Wichtig:** Firefox entfernt temporäre Erweiterungen bei jedem Neustart. Danach die Schritte 2 und 3 wiederholen. Die Einstellungen bleiben erhalten.

---

## 3. Einrichtung (einmalig)

Das Symbol von *Time Entry* anklicken und oben rechts das Zahnrad (**Settings**) wählen. Die Einstellungen öffnen sich in einem eigenen Tab.

### 3.1 Microsoft-Konto

1. Unter **Directory (tenant) ID** und **Application (client) ID** die Werte von Michael Iten einfügen.
2. **Sign in** anklicken und mit dem Microsoft-Konto anmelden. Fragt Firefox nach der Erlaubnis, Microsoft zu erreichen, diese erteilen.
3. Danach erscheint *«Signed in as …»*.

### 3.2 Excel-Datei

1. **Eigenes Blatt prüfen:** In der Zeitdatei nachsehen, ob es schon ein Blatt für dich gibt (z. B. `DavidStempel`). Falls nicht, in Excel das Blatt einer anderen Person kopieren, umbenennen (z. B. `VornameStempel`) und die alten Zeilen löschen.
2. Die Zeitdatei in Excel öffnen, **Share › Copy link** wählen, den Link unter **File link** einfügen und **Connect** anklicken.
3. Unter **Your sheet** das **eigene Blatt** wählen. Enthält der Blattname den Vornamen, ist es bereits vorausgewählt.
4. **Test** anklicken. Angezeigt werden das Blatt, die Anzahl erfasster Tage und die heutigen Einträge.

> **Wichtig:** Die Auswahl unter **Your sheet** immer kontrollieren. Sonst landen die Zeiten im Blatt einer anderen Person.

### 3.3 Modus

| Modus | Verhalten |
|:------|:----------|
| **Normal** | Die Mittagspause wird selbst gestempelt (**Start lunch** und **End lunch**). |
| **Azubi** | Keine Mittagsknöpfe während des Tages. Beim Gehen wird automatisch eine feste Pause von 12:15 bis 12:45 eingetragen. |

Zum Schluss **Save** anklicken.

> **Wichtig:** Wer bisher die Power-Automate-Flows verwendet hat, stellt diese jetzt ab. Sonst kann ein Tag doppelt erfasst werden.

---

## 4. Tägliche Bedienung

Das Symbol von *Time Entry* anklicken und den passenden Knopf drücken. Alle Einträge landen in der Zeile von heute im eigenen Blatt.

| Knopf | Was eingetragen wird | Modus |
|:------|:---------------------|:------|
| **Log in** | Neue Zeile mit Datum und Ankunftszeit (Spalte B) | beide |
| **Start lunch** | Beginn der Mittagspause (Spalte C) | Normal |
| **End lunch** | Ende der Mittagspause (Spalte E) | Normal |
| **Leave work** | Zeit des Gehens (Spalte F). Ohne gestempelte Pause gilt C = E = F, wie bisher. | Normal |
| **Leave (+30 min lunch)** | Pause 12:15 bis 12:45 (C, E) und Zeit des Gehens (F) | Azubi |

### 4.1 Anzeige im Popup

- Der **nächste sinnvolle Schritt** ist blau hervorgehoben.
- **Show all** zeigt alle Knöpfe, z. B. für eine echte Mittagspause im Modus Azubi.
- Die Statuszeile zeigt, was **heute in Excel** steht, z. B. *«in 07:57 · lunch 12:15–12:45 · out 16:05»*.
- Der Pfeilkreis oben rechts (**Sync**) liest die heutige Zeile neu aus Excel, z. B. nach einer Korrektur von Hand.
- **History** listet die letzten 50 Klicks, inklusive Fehler.
- Nach einem erfolgreichen Klick zeigt das Symbol kurz einen grünen Haken, bei einem Fehler ein rotes Ausrufezeichen.

Die Summen- und Überzeitspalten in Excel rechnen weiter wie bisher. Die Notizen in Spalte J und alles ausserhalb der eigenen Tabelle bleiben unberührt.

### 4.2 Fehler korrigieren

Die Erweiterung **überschreibt nie** eine bereits eingetragene Zeit. Falsche Zeiten direkt in Excel korrigieren und danach im Popup **Sync** drücken.

---

## 5. Teams-Nachrichten (optional)

Beim Ein- oder Ausstempeln kann die Erweiterung eine Nachricht in einen Teams-Chat schreiben. Die Nachricht kommt **vom eigenen Konto**, so als wäre sie selbst getippt.

### 5.1 Einrichten

In den Einstellungen unter **4. Teams messages**:

1. **Allow Teams access** anklicken. Zuerst fragt Firefox, ob die Erweiterung Chatnachrichten senden darf, danach fragt Microsoft nach dem Zugriff auf Chats. Beide Fragen kommen nur einmal.
2. Den Chat wählen:
   - **Load my chats** anklicken und unter **Chat** einen auswählen, **oder**
   - in Teams mit Rechtsklick auf den Chat **Copy link** wählen, den Link unter *«…or paste a chat link»* einfügen und **Use link** anklicken.
3. **Send test** anklicken. Im Chat erscheint eine Testnachricht.
4. **Send a message to Teams** ankreuzen und **Save** anklicken.

> **Hinweis:** Einen Gruppenchat oder einen 1:1-Chat verwenden. Der Teams-Chat «mit sich selbst» funktioniert meistens nicht.

### 5.2 Nachrichten anpassen

Jedes Ereignis (Log in, Start lunch, End lunch, Leave work, Leave +30 min) hat ein eigenes Feld.

- **Eine Nachricht pro Zeile.** Bei jedem Stempeln wird eine Zeile zufällig gewählt.
- Der **Vorname** wird automatisch vorangestellt: aus `flitzt nach Hause` wird «David flitzt nach Hause». Soll der Name an einer anderen Stelle stehen, dort `{name}` schreiben, z. B. `Tschüss von {name}!`
- `{time}` setzt die aktuelle Zeit ein, z. B. `hat um {time} ausgestempelt`.
- Ein Ausdruck aus einem alten Power-Automate-Flow, z. B. `createArray('…', '…')[rand(0,9)]`, wird beim Einfügen automatisch in Zeilen aufgeteilt. Ein JSON-Array funktioniert ebenfalls.
- **Preview** zeigt ein zufälliges Beispiel, **Reset to defaults** stellt die mitgelieferten Nachrichten wieder her.
- Ein **leeres** Feld bedeutet: keine Nachricht für dieses Ereignis.

Zum Schluss **Save** anklicken.

---

## 6. Fehlerbehebung

| Meldung oder Problem | Lösung |
|:---------------------|:-------|
| *«Already logged in today at …»* oder *«Already left today at …»* | Die Zeit steht schon in Excel. Falls falsch, dort korrigieren und **Sync** drücken. |
| *«Not logged in today yet»* | Zuerst **Log in** drücken. |
| *«Microsoft sign-in expired»* oder *«Not signed in»* | In den Einstellungen erneut **Sign in** anklicken. |
| *«Entra app not configured»* | Tenant ID und Client ID in den Einstellungen eintragen (siehe Abschnitt 3.1). |
| *«No time sheet selected in settings»* | Einstellungen › Excel-Datei › **Connect**, dann das eigene Blatt wählen. |
| Erweiterung ist verschwunden | Es läuft die Entwicklerversion und Firefox wurde neu gestartet. Erneut laden oder die signierte `.xpi` installieren. |
| *«Firefox permission to send Teams messages is not granted»* | In den Einstellungen erneut **Allow Teams access** anklicken. Die Berechtigung wurde in `about:addons` entzogen oder nie erteilt. |
| Excel zeigt nach einer Korrektur noch alte Werte | Bei Änderungen im Desktop-Excel kurz warten, bis alles hochgeladen ist, dann **Sync** drücken. |
| In **History** steht *«(Teams failed)»* | Die Zeit ist in Excel gespeichert. Die Teams-Einstellungen prüfen: **Allow Teams access** und **Send test**. |

> **Hinweis:** Hilft nichts davon, im Popup **History** öffnen und die Fehlermeldung an David Seeliger schicken.

---

## 7. Datenschutz

Anmeldung, Dateilink, Chat und Nachrichten werden **nur im eigenen Firefox-Profil** gespeichert. Daten gehen ausschliesslich an Microsoft (für Excel und Teams). Im Repository wird nichts gespeichert. Details stehen in [PRIVACY.md](../PRIVACY.md).
