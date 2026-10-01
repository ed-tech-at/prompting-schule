<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';


</script>
  
<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Datenschutz', href: '/mehr/datenschutz' }]} />

<main>
  <h1>Datenschutzerklärung</h1>

  <div>
    <p><i>Stand: 2026-03-27</i></p>

    <ol>
      <li><strong>Kontakt</strong></li>

      <p>
        Verantwortliche für die Verarbeitung Ihrer personenbezogenen Daten im Rahmen des Betriebs des Chatbots ist die
        Technische Universität Graz (TU Graz), Rechbauerstraße 12, 8010 Graz.
      </p>

      <p>
        Der Datenschutzbeauftragte der TU Graz ist die x-tention Informationstechnologie GmbH, Römerstraße 80A, 4600 Wels,
        erreichbar unter: datenschutzbeauftragter@tugraz.at.
      </p>

      <p>
        Bei datenschutzrechtlichen Anliegen wenden Sie sich bitte an: datenschutz@tugraz.at oder an die jeweiligen
        Kursanbieter:innen. Für Fragen zur Verarbeitung Ihrer Daten durch Microsoft Azure können Sie sich auch direkt an
        Microsoft wenden: Microsoft Corporation, One Microsoft Way, Redmond, WA 98052-6399, USA oder über
        <a href="https://support.microsoft.com/contactus" target="_blank" rel="noreferrer noopener">
          https://support.microsoft.com/contactus
        </a>.
      </p>

      <li><strong>Zweck der Datenverarbeitung</strong></li>

      <p>
        Die Verarbeitung personenbezogener Daten im Rahmen der Nutzung des LV-Beschreibungs-Chatbots erfolgt zum Zweck:
      </p>

      <ul>
        <li>der Bereitstellung und des Betriebs der Plattform,</li>
        <li>der Unterstützung von Lehrenden bei der Erstellung, Überprüfung und Verbesserung von Lehrveranstaltungsbeschreibungen,</li>
        <li>der Sicherstellung der technischen Funktionalität, Stabilität und Sicherheit des Systems,</li>
        <li>der Analyse und Verbesserung der Qualität der bereitgestellten KI-gestützten Funktionen.</li>
      </ul>

      <p>
        Darüber hinaus können anonymisierte oder pseudonymisierte Daten zur Qualitätssicherung sowie zu wissenschaftlichen
        Forschungszwecken verarbeitet werden.
      </p>

      <li><strong>Personenkategorien und Datenkategorien</strong></li>

      <p>
        Im Rahmen der Nutzung des LV-Beschreibungs-Chatbots werden die in den Benutzerrichtlinien angeführten
        Personenkategorien verarbeitet. Die für den Betrieb der Plattform erforderlichen Stammdaten (insbesondere NutzerID,
        Vor- und Nachname sowie E-Mail-Adresse) werden aus dem datenführenden Identity-Management-System der Technischen
        Universität Graz übernommen.
      </p>

      <p>
        Neben diesen Stammdaten werden jene personenbezogenen Daten verarbeitet, die im Zuge der Nutzung der Plattform
        entstehen. Dabei handelt es sich insbesondere um Inhalte der Interaktion mit dem Chatbot (z. B. Texteingaben,
        Anfragen und vom System generierte Antworten), Nutzungsdaten (z. B. Zeitpunkte und Dauer der Nutzung) sowie
        technisch erforderliche Metadaten.
      </p>

      <p>
        Darüber hinaus werden im Rahmen der Nutzung technisch notwendige Protokolldaten verarbeitet, um den sicheren und
        stabilen Betrieb des Systems zu gewährleisten. Diese Daten dienen ausschließlich der Fehleranalyse, der IT-Sicherheit
        sowie der Sicherstellung der Systemverfügbarkeit und werden nicht mit anderen personenbezogenen Daten zusammengeführt.
      </p>

      <li><strong>Einsatz von Auftragsverarbeitern / Drittanbietern</strong></li>

      <p><strong>Microsoft Azure</strong></p>

      <p>
        Zur Bereitstellung der KI-gestützten Funktionen des LV-Beschreibungs-Chatbots nutzt die TU Graz Microsoft Azure als
        technische Backend-Infrastruktur.
      </p>

      <p>
        Microsoft Azure ist ein Cloud-Computing-Dienst der Microsoft Corporation, One Microsoft Way, Redmond, WA 98052-6399,
        USA. Microsoft verarbeitet personenbezogene Daten im Auftrag der TU Graz als Auftragsverarbeiter im Sinne des
        Art. 28 Datenschutz-Grundverordnung (DSGVO).
      </p>

      <p>
        Im Rahmen der Nutzung von Microsoft Azure werden insbesondere folgende Kategorien personenbezogener Daten verarbeitet:
      </p>

      <ul>
        <li>Kommunikationsdaten (z. B. Chat-Nachrichten),</li>
        <li>Nutzungsdaten (z. B. Zugriffszeiten, Interaktionsverhalten),</li>
        <li>weitere durch die Nutzung des Chatbots generierte technische Daten (z. B. clientseitige Chatbot-Historien).</li>
      </ul>

      <p>
        Die von Nutzer:innen über die Chatbot-Funktionalität gestellten Anfragen sowie die vom Chatbot generierten Antworten
        werden zu Zwecken der Analyse, Qualitätssicherung und Weiterentwicklung des Systems auch auf der TU Graz-eigenen
        Infrastruktur gespeichert. Wo immer möglich, werden diese Daten anonymisiert oder pseudonymisiert, um die
        Privatsphäre der Nutzer:innen bestmöglich zu schützen. Darüber hinaus können anonymisierte oder pseudonymisierte Daten
        für wissenschaftliche Forschungszwecke genutzt werden. Die Ergebnisse dieser Auswertungen sind vollständig anonym und
        lassen keinen Rückschluss auf einzelne Personen zu.
      </p>

      <p>
        Im Rahmen der Nutzung von Microsoft Azure kann es zur Übermittlung personenbezogener Daten an Microsoft sowie zu einer
        Verarbeitung in Drittländern, insbesondere in den USA, kommen. Der Schutz Ihrer Daten wird durch geeignete Garantien
        gemäß Art. 46 DSGVO, insbesondere durch den Abschluss von Standardvertragsklauseln, sichergestellt.
      </p>

      <p>
        Microsoft verarbeitet die Daten gemäß den geltenden Datenschutzbestimmungen. Weitere Informationen finden Sie in den
        Datenschutzerklärungen von Microsoft unter:
      </p>

      <ul>
        <li>
          <a href="https://privacy.microsoft.com/de-de/privacystatement" target="_blank" rel="noreferrer noopener">
            https://privacy.microsoft.com/de-de/privacystatement
          </a>
        </li>
        <li>
          <a href="https://learn.microsoft.com/de-de/legal/cognitive-services/openai/data-privacy" target="_blank" rel="noreferrer noopener">
            https://learn.microsoft.com/de-de/legal/cognitive-services/openai/data-privacy
          </a>
        </li>
      </ul>

      <li><strong>Rechtsgrundlagen</strong></li>

      <p>
        Die Verarbeitung personenbezogener Daten im Rahmen der Nutzung des LV-Beschreibungs-Chatbots erfolgt auf Grundlage
        der DSGVO.
      </p>

      <p>
        Datenverarbeitungen, die zur Bereitstellung und Nutzung der Plattform erforderlich sind, erfolgen auf Grundlage von
        Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines Vertrages bzw. Durchführung vorvertraglicher Maßnahmen). Sofern die
        Bereitstellung personenbezogener Daten für diese Zwecke erforderlich ist, kann eine Nichtbereitstellung dazu führen,
        dass die Nutzung der Plattform nicht oder nur eingeschränkt möglich ist.
      </p>

      <p>
        Soweit die Verarbeitung personenbezogener Daten im Zusammenhang mit der Wahrnehmung von Aufgaben im öffentlichen
        Interesse erfolgt, insbesondere zur Unterstützung der Lehre an der Technischen Universität Graz, stützt sich diese
        Verarbeitung auf Art. 6 Abs. 1 lit. e DSGVO in Verbindung mit § 2, § 3 und § 13 UG 2002.
      </p>

      <p>
        Sofern bestimmte Verarbeitungen auf einer freiwilligen Einwilligung der Nutzer:innen beruhen, erfolgt die
        Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO. Eine erteilte Einwilligung kann jederzeit mit Wirkung für
        die Zukunft widerrufen werden, wobei die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung hiervon unberührt
        bleibt.
      </p>

      <li><strong>Speicherdauer</strong></li>

      <p>
        Personenbezogene Daten werden nur so lange gespeichert, wie dies für die Erfüllung der genannten Zwecke erforderlich
        ist oder gesetzliche Aufbewahrungspflichten bestehen.
      </p>

      <p>
        Chat-Interaktionen und Nutzungsdaten werden jeweils bis zum 31.12. gespeichert und anschließend gelöscht oder
        anonymisiert.
      </p>

      <p>Technische Logdaten werden zeitlich beschränkt gespeichert und regelmäßig gelöscht.</p>

      <p>
        Anonymisierte oder pseudonymisierte Daten können zu Forschungs- und Qualitätszwecken längerfristig verarbeitet werden.
      </p>

      <li><strong>Verarbeitung zu wissenschaftlichen Forschungszwecken</strong></li>

      <p>
        Die TU Graz verarbeitet pseudonymisierte und anonymisierte Daten in weiterer Folge unter Einhaltung geeigneter
        technischer und organisatorischer Maßnahmen zu wissenschaftlichen Forschungszwecken, insbesondere um das Verständnis
        und die Weiterentwicklung der Technologie und der Nutzerinteraktionen zu fördern. Eine Identifizierung einzelner
        Personen ist dabei ausgeschlossen. Rechtsgrundlage dieser Auswertungen ist das öffentliche Interesse nach Artikel 6
        Absatz 1 lit e DSGVO.
      </p>

      <li><strong>Betroffenenrechte</strong></li>

      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Übertragbarkeit, Einschränkung, Widerspruch und Löschung der Daten,
        wobei festgehalten wird, dass eine Nutzung des LV-Beschreibungs-Chatbots ohne die Verarbeitung von personenbezogenen
        Daten nicht möglich ist. Darüber hinaus besteht ein Widerrufsrecht gegen die Datenverarbeitung. Bedenken Sie aber,
        dass durch einen Widerruf die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung nicht berührt wird. Des
        Weiteren kann eine Ausübung dieser Rechte nicht zu einer Auflösung vertraglicher oder gesetzlicher Pflichten führen.
      </p>

      <p>
        Darüber hinaus haben Sie das Recht, sich bei der Österreichischen Datenschutzbehörde zu beschweren, wenn Sie der
        Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt.
      </p>
    </ol>
  </div>

  <a href={resolve("/")}>Zur Startseite</a>
</main>