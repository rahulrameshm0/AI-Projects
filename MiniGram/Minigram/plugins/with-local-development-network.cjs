const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=function(config){
 config=withAndroidManifest(config,c=>{c.modResults.manifest.application[0].$['android:networkSecurityConfig']='@xml/minigram_network_security';return c;});
 return withDangerousMod(config,['android',async c=>{const directory=path.join(c.modRequest.platformProjectRoot,'app/src/main/res/xml');await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'minigram_network_security.xml'),`<?xml version="1.0" encoding="utf-8"?>
<network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain>localhost</domain><domain>127.0.0.1</domain><domain>10.0.2.2</domain></domain-config></network-security-config>`);return c;}]);
};
