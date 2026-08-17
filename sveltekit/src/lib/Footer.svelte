<script>
  import { asset, resolve } from '$app/paths';
</script>
<footer>
  <div class="">
  
    <div class="logo">
    
    <a href={resolve('/')}><h3><img src={asset("/logo-prompting.schule-bg.png")}  alt="prompting.schule Logo"> prompting.schule</h3></a>
    <p>Werden Sie zum Prompt-Engineering-Champion</p>
    </div>

     <div style="margin-top: 1.5em;">
        <p>Diese Seite ist lizenziert unter <br>
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="license noopener noreferrer" style="display: inline-block;">CC BY 4.0 <img decoding="async" style="    height: 1.2em !important;
    margin-left: 3px;
    vertical-align: sub;
    " src={asset("/img/cc.svg")} alt="CC"><img decoding="async" style="    height: 1.2em !important;
    margin-left: 3px;
    vertical-align: sub;
    " src={asset("/img/by.svg")} alt="BY"></a><br>
          Lehr- und Lerntechnologien, TU Graz</p>
      </div>

    
  </div>
  <div class="links">
    <div>
      <h3>Über uns</h3>
      <!-- <a href={resolve("/mehr/forschung">Forschungs-Team</a> -->
      <!-- <a href={resolve("https://prompting.schule">German Prompting.Schule</a> -->
      <a href="https://bildungsinformatik.at">Bildungsinformatik<br>EdTech Research Community Graz</a>
      <a href="https://tugraz.at/">Technische Universität Graz</a> <a href="https://tugraz.at/oe/lehr-und-lerntechnologien/">Lehr- und Lerntechnologien</a>
    </div>
    <div>
      <h3>Mehr erfahren</h3>
      <!-- <a href={resolve("/mehr/badges">Badges</a> -->
      <!-- <a href={resolve("/mehr/zertifikate">Zertifikat</a> -->
      <!-- <a href={resolve("/mehr/didaktisches-konzept">Didaktisches Konzept</a> -->
      <a href='https://github.com/ed-tech-at/prompting-schule' target="_blank">Code @ GitHub <i class="fab fa-github"></i></a>
      <a href={resolve("/mehr/datenschutz")}>Datenschutz</a>
      <a href={resolve("/mehr/benutzerrichtlinien")}>Benutzerrichtlinien</a>
      <a href={resolve("/mehr/impressum")}>Impressum</a>


     
      
    </div>
  
  </div>  
</footer>
