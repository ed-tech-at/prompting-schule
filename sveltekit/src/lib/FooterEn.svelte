<script>
  import { asset, resolve } from '$app/paths';

</script>
<footer>
  <div class="">
  <div class="logo">
    
    <a href={resolve('/en')}><h3><img src={asset("/logo-prompting.schule-bg.png")}  alt="prompting.school Logo"> prompting.school</h3></a>
    <p>Become a prompt engineering champion</p>
  </div>


       <div style="margin-top: 1.5em;">
        <p>This page is licensed under <br>
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="license noopener noreferrer" style="display: inline-block;">CC BY 4.0 <img decoding="async" style="    height: 1.2em !important;
    margin-left: 3px;
    vertical-align: sub;
    " src={asset("/img/cc.svg")} alt="CC"><img decoding="async" style="    height: 1.2em !important;
    margin-left: 3px;
    vertical-align: sub;
    " src={asset("/img/by.svg")} alt="BY"></a><br>
          Educational Technologies, TU Graz</p>
      </div>


  </div>

  <div class="links">
    <div>
      <h3>Languages</h3>
      <!-- <a href={resolve("/mehr/forschung">Forschungs-Team</a> -->
      <!-- <a href={resolve("https://prompting.schule">German Prompting.Schule</a> -->
      <a href="https://prompting.schule">German prompting.schule</a>
      <a href="https://prompting.school/en">English prompting.school</a>
      
    </div>
    <div>
      <h3>About us</h3>
      <!-- <a href={resolve("/mehr/forschung">Forschungs-Team</a> -->
      <!-- <a href="https://prompting.schule">German Prompting.Schule</a> -->
      <a href="https://ed-tech.at">EdTech Research Community Graz</a>
      <a href="https://tugraz.at/en">Graz University of Technology</a> <a href="https://tugraz.at/en/oe/lehr-und-lerntechnologien/">Educational Technology</a>
    </div>
    <div>
      <h3>Learn more</h3>
      <!-- <a href={resolve("/mehr/badges")}>Badges</a> -->
      <!-- <a href={resolve("/mehr/zertifikate")}>Zertifikat</a> -->
      <!-- <a href={resolve("/mehr/didaktisches-konzept">Didaktisches Konzept</a> -->
      <a href='https://github.com/ed-tech-at/prompting-schule' target="_blank">Code @ GitHub <i class="fab fa-github"></i></a>
      <a href={resolve("/mehr/datenschutz")}>Data Protection</a>
      <a href={resolve("/mehr/impressum")}>Imprint</a>
    </div>

  </div>
</footer>
