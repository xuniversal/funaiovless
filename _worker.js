// worker.js
import { connect } from "cloudflare:sockets";
var listProxy = [
  { path: "/sg-byte", proxy: "89.34.227.166" },  
  { path: "/sg-soft", proxy: "119.81.201.154:9089" },
  { path: "/sg-tencent", proxy: "43.134.34.18" },
  { path: "/sg-cdsglobal", proxy: "164.52.2.100" },
  { path: "/sg-ovhsas", proxy: "51.79.254.182" },
  { path: "/sg-do", proxy: "104.248.145.216" },
  { path: "/sg-oracle", proxy: "129.150.50.63" },
  { path: "/sg-first", proxy: "194.36.179.237" },
  { path: "/sg-amazon", proxy: "52.74.101.26" },
  { path: "/id-gcp", proxy: "35.219.50.99" },
  { path: "/id-ptctn", proxy: "103.133.223.52:2096" },
  { path: "/id-herza", proxy: "103.168.146.169:20132" },
  { path: "/id-beon", proxy: "101.50.0.114:8443" },
  { path: "/my-streamyx", proxy: "210.186.12.244" },
  //tambahin sendiri
];
var proxyIP;
var proxyPort;
var worker_default = {
  async fetch(request, ctx) {
    try {
      proxyIP = proxyIP;
      const url = new URL(request.url);
      const upgradeHeader = request.headers.get("Upgrade");
      for (const entry of listProxy) {
        if (url.pathname === entry.path) {
          [proxyIP, proxyPort] = entry.proxy.split(':');
          break;
        }
      }
      if (upgradeHeader === "websocket" && proxyIP) {
        return await vlessOverWSHandler(request);
      }
      const allConfig = await getAllConfigVless(request.headers.get("Host"));
      return new Response(allConfig, {
        status: 200,
        headers: { "Content-Type": "text/html;charset=utf-8" }
      });
    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  }
};
async function getAllConfigVless(hostName) {
  try {
    let vlessConfigs = "";
    let clashConfigs = "";
    for (const entry of listProxy) {
      const { path, proxy } = entry;
      const [ipOnly] = proxy.split(':');
      const response = await fetch(`http://ip-api.com/json/${ipOnly}`);
      const data = await response.json();
      const pathFixed = encodeURIComponent(path);
      const vlessTls = `vless://${generateUUIDv4()}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=${pathFixed}#${data.isp} (${data.countryCode})`;
      const vlessNtls = `vless://${generateUUIDv4()}@${hostName}:80?path=${pathFixed}&security=none&encryption=none&host=${hostName}&fp=randomized&type=ws&sni=${hostName}#${data.isp} (${data.countryCode})`;
      const vlessTlsFixed = vlessTls.replace(/ /g, "+");
      const vlessNtlsFixed = vlessNtls.replace(/ /g, "+");
      const clashConfTls = `- name: ${data.isp} (${data.countryCode})
  server: ${hostName}
  port: 443
  type: vless
  uuid: ${generateUUIDv4()}
  cipher: auto
  tls: true
  udp: true
  skip-cert-verify: true
  network: ws
  servername: ${hostName}
  ws-opts:
    path: ${path}
    headers:
      Host: ${hostName}`;
      const clashConfNtls = `- name: ${data.isp} (${data.countryCode})
  server: ${hostName}
  port: 80
  type: vless
  uuid: ${generateUUIDv4()}
  cipher: auto
  tls: false
  udp: true
  skip-cert-verify: true
  network: ws
  ws-opts:
    path: ${path}
    headers:
      Host: ${hostName}`;
      clashConfigs += `<div style="display: none;">
   <textarea id="clashTls${path}">${clashConfTls}</textarea>
 </div>
<div style="display: none;">
   <textarea id="clashNtls${path}">${clashConfNtls}</textarea>
 </div>
<div class="config-section">
    <p><strong>ISP  :  ${data.isp} (${data.countryCode})</strong> </p>
    <hr/>
    <div class="config-toggle">
        <button class="button" onclick="toggleConfig(this, 'show clash', 'hide clash')">Show Clash</button>
        <div class="config-content">
            <div class="config-block">
                <h3>TLS:</h3>
                <p class="config">${clashConfTls}</p>
                <button class="button" onclick='copyClash("clashTls${path}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
            <hr />
            <div class="config-block">
                <h3>NTLS:</h3>
                <p class="config">${clashConfNtls}</p>
                <button class="button" onclick='copyClash("clashNtls${path}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
        </div>
    </div>
</div>
<hr class="config-divider" />
`;
      vlessConfigs += `<div class="config-section">
    <p><strong>ISP  :  ${data.isp} (${data.countryCode}) </strong> </p>
    <hr />
    <div class="config-toggle">
        <button class="button" onclick="toggleConfig(this, 'show vless', 'hide vless')">Show Vless</button>
        <div class="config-content">
            <div class="config-block">
                <h3>TLS:</h3>
                <p class="config">${vlessTlsFixed}</p>
                <button class="button" onclick='copyToClipboard("${vlessTlsFixed}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
            <hr />
            <div class="config-block">
                <h3>NTLS:</h3>
                <p class="config">${vlessNtlsFixed}</p>
                <button class="button" onclick='copyToClipboard("${vlessNtlsFixed}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
            <hr />
        </div>
    </div>
</div>
<hr class="config-divider" />
`;
    }
    const htmlConfigs = `
<html>
<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Vless | CLoudFlare</title>
<style>
  html, body {
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-color: #1a1a1a;
    font-family: 'Roboto', Arial, sans-serif;
    margin: 0;
  }
  body {
    display: flex;
    background: url('https://raw.githubusercontent.com/bitzblack/ip/refs/heads/main/shubham-dhage-5LQ_h5cXB6U-unsplash.jpg') no-repeat center center fixed;
    background-size: cover;
    justify-content: center;
    align-items: center;
  }
  .popup {
    width: 95vw;
    height: 90vh;
    border-radius: 15px;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    display: grid;
    grid-template-columns: 1.5fr 3fr;
    box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  .tabs {
    background-color: #1a1a1a;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    overflow-x: hidden;
    border-right: 2px solid #b29b59;
  }
  .author-link {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-weight: bold;
    font-style: italic;
    color: #b29b59; /* Warna emas */
    font-size: 12px;
    text-decoration: none;
    z-index: 10;
  }

  .author-link:hover {
    color: #d4af37; /* Warna emas lebih terang saat hover */
  }
  label {
    font-size: 12px;
    cursor: pointer;
    color: #b29b59;
    padding: 10px;
    background-color: #222;
    border-radius: 8px;
    text-align: left;
    transition: background-color 0.3s ease, transform 0.3s ease;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
    white-space: normal;
    overflow-wrap: break-word;
  }
  label:hover {
    background-color: #b29b59;
    color: #222;
    transform: translateY(-2px);
  }
  input[type="radio"] {
    display: none;
  }
  .tab-content {
    padding: 20px;
    overflow-y: auto;
    color: #f3f4f6;
    font-size: 14px;
    background-color: #111;
    height: 100%;
    box-sizing: border-box;
  }
  .content {
    display: none;
    padding-right: 15px;
  }
  .content.active {
    display: block;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  h1 {
    font-size: 18px;
    color: #b29b59; /* Warna emas */
    margin-bottom: 10px;
  }
  h2 {
    font-size: 22px;
    color: #b29b59; /* Warna emas */
    text-align: center;
  }
  pre {
    background-color: rgba(229, 231, 235, 0.1);
    padding: 10px;
    border-radius: 8px;
    font-size: 12px;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #b29b59; /* Warna emas */
    border: 1px solid #b29b59;
  }
  .config-divider {
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, #b29b59, transparent);
    margin: 40px 0;
  }
  .config-description {
    font-weight: bold;
    font-style: italic;
    color: #b29b59; /* Warna emas */
    font-size: 14px;
    text-align: justify;
    margin: 0 10px; /* Tambahkan margin kiri-kanan agar tidak terlalu mepet */
  }
  button {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background-color: #b29b59;
    color: #111;
    cursor: pointer;
    font-weight: bold;
    display: block;
    text-align: left;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
  }
  button:hover {
    background-color: #c8a947;
  }
  #search {
    background: #333;
    color: #b29b59;
    border: 1px solid #b29b59;
    border-radius: 6px;
    padding: 5px;
    margin-bottom: 10px;
    width: 100%;
  }
  #search::placeholder {
    color: #b29b59;
  }
</style>
</head>
<body>
  <div class="popup">
    <div class="tabs" role="tablist">
      
    <input type="radio" id="tab1" name="tab" checked="">
    <label for="tab1" class="tab-label">(SG) ByteVirt LLC</label>
    
    <input type="radio" id="tab2" name="tab">
    <label for="tab2" class="tab-label">(SG) Softlayer</label>

    <input type="radio" id="tab3" name="tab">
    <label for="tab3" class="tab-label">(SG) Tencent</label>
  
    <input type="radio" id="tab4" name="tab">
    <label for="tab4" class="tab-label">(SG) CDS Global</label>

    <input type="radio" id="tab5" name="tab">
    <label for="tab5" class="tab-label">(SG) OVH SAS</label>
    
    <input type="radio" id="tab6" name="tab">
    <label for="tab6" class="tab-label">(SG) Digital Ocean</label>

    <input type="radio" id="tab7" name="tab">
    <label for="tab7" class="tab-label">(SG) Oracle</label>
  
    <input type="radio" id="tab8" name="tab">
    <label for="tab8" class="tab-label">(SG) First Server Limited</label>	  
    
    <input type="radio" id="tab9" name="tab">
    <label for="tab9" class="tab-label">(SG) Amazon</label>
    
    <input type="radio" id="tab10" name="tab">
    <label for="tab10" class="tab-label">(ID) Google Cloud</label>

    <input type="radio" id="tab11" name="tab">
    <label for="tab11" class="tab-label">(ID) PT Cloud Teknologi Nusantara</label>
  
    <input type="radio" id="tab12" name="tab">
    <label for="tab12" class="tab-label">(ID) PT Herza Digital Indonesia</label>
  
    <input type="radio" id="tab13" name="tab">
    <label for="tab13" class="tab-label">(ID) PT Beon Intermedia</label>
  
    <input type="radio" id="tab14" name="tab">
    <label for="tab14" class="tab-label">(MY) ADSL Streamyx Telekom Malaysia</label>	  
  
    </div>
    <div class="tab-content">
    <div class="content active">
        <h2><center>V2RAY CLOUDFLARE</center></h2><br>
        <h1>ByteVirt LLC 🇸🇬</h1>
        <h1>89.34.227.166</h1><br>
        <h1>List Wildcard</h1>
        <pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
        <hr class="config-divider">
        <h2><center>VLESS</center></h2><br>
        <h1>Vless Tls</h1>
        <pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-byte#(SG) ByteVirt LLC 🇸🇬</pre>
        <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-byte#(SG) ByteVirt LLC 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
        <h1>Vless N-Tls</h1>
        <pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-byte&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) ByteVirt LLC 🇸🇬</pre>
        <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-byte&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) ByteVirt LLC 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
    <hr class="config-divider">
    </div>

    <div class="content ">
    <h2><center>V2RAY CLOUDFLARE</center></h2><br>
    <h1>Softlayer 🇸🇬</h1>
    <h1>119.81.201.154:9089</h1><br>
    <h1>List Wildcard</h1>
      <pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
      <hr class="config-divider">
      <h2><center>VLESS</center></h2><br>
      <h1>Vless Tls</h1>
      <pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-soft#(SG) Softlayer 🇸🇬</pre>
      <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-soft#(SG) Softlayer 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
      <h1>Vless N-Tls</h1>
      <pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-soft&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) Softlayer 🇸🇬</pre>
      <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-soft&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) Softlayer 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
  <hr class="config-divider">
  </div>

  <div class="content ">
  <h2><center>V2RAY CLOUDFLARE</center></h2><br>
  <h1>Tencent Cloud Computing 🇸🇬</h1>
  <h1>43.134.34.18</h1><br>
  <h1>List Wildcard</h1>
    <pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
    <hr class="config-divider">
    <h2><center>VLESS</center></h2><br>
    <h1>Vless Tls</h1>
    <pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-tencent#(SG) Tencent Cloud Computing 🇸🇬</pre>
    <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-tencent#(SG) Tencent Cloud Computing 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
    <h1>Vless N-Tls</h1>
    <pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-tencent&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) Tencent Cloud Computing 🇸🇬</pre>
    <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-tencent&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#(SG) Tencent Cloud Computing 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>CDS Global Cloud 🇸🇬</h1>
<h1>164.52.2.100</h1><br>
<h1>List Wildcard</h1>
  <pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
  <hr class="config-divider">
  <h2><center>VLESS</center></h2><br>
  <h1>Vless Tls</h1>
  <pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-cdsglobal#CDS Global Cloud 🇸🇬</pre>
  <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-cdsglobal#CDS Global Cloud 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
  <h1>Vless N-Tls</h1>
  <pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-cdsglobal&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#CDS Global Cloud 🇸🇬</pre>
  <button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-cdsglobal&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#CDS Global Cloud 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>OVH SAS 🇸🇬</h1>
<h1>51.79.254.182</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-ovhsas#OVH SAS 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-ovhsas#OVH SAS 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-ovhsas&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#OVH SAS 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-ovhsas&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#OVH SAS 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>Digital Ocean 🇸🇬</h1>
<h1>104.248.145.216</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-do#Digital Ocean 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-do#Digital Ocean 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-do&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Digital Ocean 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-do&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Digital Ocean 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>Oracle 🇸🇬</h1>
<h1>129.150.50.63</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-oracle#Oracle 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-oracle#Oracle 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-oracle&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Oracle 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-oracle&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Oracle 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>First Server Limited 🇸🇬</h1>
<h1>194.36.179.237</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-first#First Server Limited 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-first#First Server Limited 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-first&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#First Server Limited 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-first&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#First Server Limited 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>Amazon 🇸🇬</h1>
<h1>52.74.101.26</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-amazon#Amazon 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fsg-amazon#Amazon 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-amazon&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Amazon 🇸🇬</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fsg-amazon&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Amazon 🇸🇬')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>Google Cloud 🇮🇩</h1>
<h1>35.219.50.99</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-gcp#Google Cloud 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-gcp#Google Cloud 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-gcp&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Google Cloud 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-gcp&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#Google Cloud 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>PT Cloud Teknologi Nusantara 🇮🇩</h1>
<h1>103.133.223.52:2096</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-ptctn#PT Cloud Teknologi Nusantara 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-ptctn#PT Cloud Teknologi Nusantara 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-ptctn&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Cloud Teknologi Nusantara 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-ptctn&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Cloud Teknologi Nusantara 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>PT Herza Digital Indonesia 🇮🇩</h1>
<h1>103.168.146.169:20132</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-herza#PT Herza Digital Indonesia 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-herza#PT Herza Digital Indonesia 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-herza&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Herza Digital Indonesia 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-herza&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Herza Digital Indonesia 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>PT Beon Intermedia 🇮🇩</h1>
<h1>101.50.0.114:8443</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-beon#PT Beon Intermedia 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fid-beon#PT Beon Intermedia 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-beon&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Beon Intermedia 🇮🇩</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fid-beon&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#PT Beon Intermedia 🇮🇩')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<div class="content ">
<h2><center>V2RAY CLOUDFLARE</center></h2><br>
<h1>ADSL Streamyx Telekom Malaysia 🇲🇾</h1>
<h1>210.186.12.244</h1><br>
<h1>List Wildcard</h1>
<pre>✰ zaintest.vuclip.com.ohmy.proxybox.us.kg<br>
✰ ava.game.naver.com.ohmy.proxybox.us.kg<br>
✰ support.zoom.us.ohmy.proxybox.us.kg<br>
✰ zoomgov.ohmy.proxybox.us.kg<br>
✰ graph.instagram.com.ohmy.proxybox.us.kg</pre><br>
<hr class="config-divider">
<h2><center>VLESS</center></h2><br>
<h1>Vless Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fmy-streamyx#ADSL Streamyx Telekom Malaysia 🇲🇾</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:443?encryption=none&amp;security=tls&amp;sni=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;host=ohmy.proxybox.us.kg&amp;path=%2Fmy-streamyx#ADSL Streamyx Telekom Malaysia 🇲🇾')"><i class="fas fa-copy"></i>Copy</button><br>
<h1>Vless N-Tls</h1>
<pre>vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fmy-streamyx&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#ADSL Streamyx Telekom Malaysia 🇲🇾</pre>
<button onclick="copyToClipboard('vless://menuju-indonesia-emas@masukan.bug.ws:80?path=%2Fmy-streamyx&amp;security=none&amp;encryption=none&amp;host=ohmy.proxybox.us.kg&amp;fp=randomized&amp;type=ws&amp;sni=ohmy.proxybox.us.kg#ADSL Streamyx Telekom Malaysia 🇲🇾')"><i class="fas fa-copy"></i>Copy</button><br>
<hr class="config-divider">
</div>

<a href="https://t.me/Bitz_Black" class="author-link" target="_blank">@Bitz_Black</a>
</div>

  
 <script>
    function filterTabs() {
      const labels = document.querySelectorAll('.tab-label');
      labels.forEach(label => {
        const countryCode = label.getAttribute('data-country');
        const associatedInput = document.getElementById(label.getAttribute('for'));
        if (countryCode.includes(query)) {
          label.style.display = 'block'; // Tampilkan label
          associatedInput.style.display = 'none'; // Sembunyikan input radio
        } else {
          label.style.display = 'none'; // Sembunyikan label
          associatedInput.style.display = 'none'; // Sembunyikan input radio
        }
      });
    }
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text)
        .then(() => {
          displayAlert("Successfully copied to clipboard!", '#b29b59');
        })
        .catch((err) => {
          displayAlert("Failed to copy to clipboard: " + err, '#b29b59');
        });
    }
    function displayAlert(message, backgroundColor) {
      const alertBox = document.createElement('div');
      alertBox.textContent = message;
      Object.assign(alertBox.style, {
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: backgroundColor,
          color: '#222',
          padding: '5px 10px',
          borderRadius: '5px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          opacity: '0',
          transition: 'opacity 0.5s ease-in-out',
          zIndex: '1000'
      });
      document.body.appendChild(alertBox);

      requestAnimationFrame(() => {
          alertBox.style.opacity = '1';
      });

      setTimeout(() => {
          alertBox.style.opacity = '0';
          setTimeout(() => {
              document.body.removeChild(alertBox);
          }, 500);
      }, 2000);
    }
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.button-modern').forEach(button => {
        if (button.textContent.trim() === "Copy") {
            button.addEventListener('click', function() {
                const textToCopy = this.previousElementSibling.textContent;
                copyToClipboard(textToCopy);
            });
        }
    });
});
    document.querySelectorAll('input[name="tab"]').forEach((tab, index) => {
      tab.addEventListener('change', function() {
        const contents = document.querySelectorAll('.content');
        contents.forEach(content => content.classList.remove('active'));
        contents[index].classList.add('active');
      });
    });
  </script>

</body>
</html>`;
    return htmlConfigs;
  } catch (error) {
    return `An error occurred while generating the VLESS configurations. ${error}`;
  }
}
function generateUUIDv4() {
  const randomValues = crypto.getRandomValues(new Uint8Array(16));
  randomValues[6] = randomValues[6] & 15 | 64;
  randomValues[8] = randomValues[8] & 63 | 128;
  return [
    randomValues[0].toString(16).padStart(2, "0"),
    randomValues[1].toString(16).padStart(2, "0"),
    randomValues[2].toString(16).padStart(2, "0"),
    randomValues[3].toString(16).padStart(2, "0"),
    randomValues[4].toString(16).padStart(2, "0"),
    randomValues[5].toString(16).padStart(2, "0"),
    randomValues[6].toString(16).padStart(2, "0"),
    randomValues[7].toString(16).padStart(2, "0"),
    randomValues[8].toString(16).padStart(2, "0"),
    randomValues[9].toString(16).padStart(2, "0"),
    randomValues[10].toString(16).padStart(2, "0"),
    randomValues[11].toString(16).padStart(2, "0"),
    randomValues[12].toString(16).padStart(2, "0"),
    randomValues[13].toString(16).padStart(2, "0"),
    randomValues[14].toString(16).padStart(2, "0"),
    randomValues[15].toString(16).padStart(2, "0")
  ].join("").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}
async function vlessOverWSHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);
  webSocket.accept();
  let address = "";
  let portWithRandomLog = "";
  const log = (info, event) => {
    console.log(`[${address}:${portWithRandomLog}] ${info}`, event || "");
  };
  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);
  let remoteSocketWapper = {
    value: null
  };
  let udpStreamWrite = null;
  let isDns = false;
  readableWebSocketStream.pipeTo(new WritableStream({
    async write(chunk, controller) {
      if (isDns && udpStreamWrite) {
        return udpStreamWrite(chunk);
      }
      if (remoteSocketWapper.value) {
        const writer = remoteSocketWapper.value.writable.getWriter();
        await writer.write(chunk);
        writer.releaseLock();
        return;
      }
      const {
        hasError,
        message,
        portRemote = 443,
        addressRemote = "",
        rawDataIndex,
        vlessVersion = new Uint8Array([0, 0]),
        isUDP
      } = processVlessHeader(chunk);
      address = addressRemote;
      portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? "udp " : "tcp "} `;
      if (hasError) {
        throw new Error(message);
        return;
      }
      if (isUDP) {
        if (portRemote === 53) {
          isDns = true;
        } else {
          throw new Error("UDP proxy only enable for DNS which is port 53");
          return;
        }
      }
      const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
      const rawClientData = chunk.slice(rawDataIndex);
      if (isDns) {
        const { write } = await handleUDPOutBound(webSocket, vlessResponseHeader, log);
        udpStreamWrite = write;
        udpStreamWrite(rawClientData);
        return;
      }
      handleTCPOutBound(remoteSocketWapper, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log);
    },
    close() {
      log(`readableWebSocketStream is close`);
    },
    abort(reason) {
      log(`readableWebSocketStream is abort`, JSON.stringify(reason));
    }
  })).catch((err) => {
    log("readableWebSocketStream pipeTo error", err);
  });
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}
async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log) {
  async function connectAndWrite(address, port) {
    const tcpSocket2 = connect({
      hostname: address,
      port
    });
    remoteSocket.value = tcpSocket2;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket2.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket2;
  }
  async function retry() {
    const tcpSocket2 = await connectAndWrite(proxyIP || addressRemote, proxyPort || portRemote);
    tcpSocket2.closed.catch((error) => {
      console.log("retry tcpSocket closed error", error);
    }).finally(() => {
      safeCloseWebSocket(webSocket);
    });
    remoteSocketToWS(tcpSocket2, webSocket, vlessResponseHeader, null, log);
  }
  const tcpSocket = await connectAndWrite(addressRemote, portRemote);
  remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
}
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener("message", (event) => {
        if (readableStreamCancel) {
          return;
        }
        const message = event.data;
        controller.enqueue(message);
      });
      webSocketServer.addEventListener(
        "close",
        () => {
          safeCloseWebSocket(webSocketServer);
          if (readableStreamCancel) {
            return;
          }
          controller.close();
        }
      );
      webSocketServer.addEventListener(
        "error",
        (err) => {
          log("webSocketServer has error");
          controller.error(err);
        }
      );
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },
    pull(controller) {
    },
    cancel(reason) {
      if (readableStreamCancel) {
        return;
      }
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    }
  });
  return stream;
}
function processVlessHeader(vlessBuffer) {
  if (vlessBuffer.byteLength < 24) {
    return {
      hasError: true,
      message: "invalid data"
    };
  }
  const version = new Uint8Array(vlessBuffer.slice(0, 1));
  let isValidUser = true;
  let isUDP = false;
  if (!isValidUser) {
    return {
      hasError: true,
      message: "invalid user"
    };
  }
  const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
  const command = new Uint8Array(
    vlessBuffer.slice(18 + optLength, 18 + optLength + 1)
  )[0];
  if (command === 1) {
  } else if (command === 2) {
    isUDP = true;
  } else {
    return {
      hasError: true,
      message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`
    };
  }
  const portIndex = 18 + optLength + 1;
  const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  let addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(
    vlessBuffer.slice(addressIndex, addressIndex + 1)
  );
  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = "";
  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      ).join(".");
      break;
    case 2:
      addressLength = new Uint8Array(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + 1)
      )[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      );
      break;
    case 3:
      addressLength = 16;
      const dataView = new DataView(
        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      );
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return {
        hasError: true,
        message: `invild  addressType is ${addressType}`
      };
  }
  if (!addressValue) {
    return {
      hasError: true,
      message: `addressValue is empty, addressType is ${addressType}`
    };
  }
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType,
    portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    vlessVersion: version,
    isUDP
  };
}
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry, log) {
  let remoteChunkCount = 0;
  let chunks = [];
  let vlessHeader = vlessResponseHeader;
  let hasIncomingData = false;
  await remoteSocket.readable.pipeTo(
    new WritableStream({
      start() {
      },
      async write(chunk, controller) {
        hasIncomingData = true;
        if (webSocket.readyState !== WS_READY_STATE_OPEN) {
          controller.error(
            "webSocket.readyState is not open, maybe close"
          );
        }
        if (vlessHeader) {
          webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
          vlessHeader = null;
        } else {
          webSocket.send(chunk);
        }
      },
      close() {
        log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
      },
      abort(reason) {
        console.error(`remoteConnection!.readable abort`, reason);
      }
    })
  ).catch((error) => {
    console.error(
      `remoteSocketToWS has exception `,
      error.stack || error
    );
    safeCloseWebSocket(webSocket);
  });
  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}
function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { error: null };
  }
  try {
    base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return { earlyData: arryBuffer.buffer, error: null };
  } catch (error) {
    return { error };
  }
}
var WS_READY_STATE_OPEN = 1;
var WS_READY_STATE_CLOSING = 2;
function safeCloseWebSocket(socket) {
  try {
    if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
      socket.close();
    }
  } catch (error) {
    console.error("safeCloseWebSocket error", error);
  }
}
async function handleUDPOutBound(webSocket, vlessResponseHeader, log) {
  let isVlessHeaderSent = false;
  const transformStream = new TransformStream({
    start(controller) {
    },
    transform(chunk, controller) {
      for (let index = 0; index < chunk.byteLength; ) {
        const lengthBuffer = chunk.slice(index, index + 2);
        const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
        const udpData = new Uint8Array(
          chunk.slice(index + 2, index + 2 + udpPakcetLength)
        );
        index = index + 2 + udpPakcetLength;
        controller.enqueue(udpData);
      }
    },
    flush(controller) {
    }
  });
  transformStream.readable.pipeTo(new WritableStream({
    async write(chunk) {
      const resp = await fetch(
        "https://1.1.1.1/dns-query",
        {
          method: "POST",
          headers: {
            "content-type": "application/dns-message"
          },
          body: chunk
        }
      );
      const dnsQueryResult = await resp.arrayBuffer();
      const udpSize = dnsQueryResult.byteLength;
      const udpSizeBuffer = new Uint8Array([udpSize >> 8 & 255, udpSize & 255]);
      if (webSocket.readyState === WS_READY_STATE_OPEN) {
        log(`doh success and dns message length is ${udpSize}`);
        if (isVlessHeaderSent) {
          webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
        } else {
          webSocket.send(await new Blob([vlessResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
          isVlessHeaderSent = true;
        }
      }
    }
  })).catch((error) => {
    log("dns udp has error" + error);
  });
  const writer = transformStream.writable.getWriter();
  return {
    write(chunk) {
      writer.write(chunk);
    }
  };
}
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
