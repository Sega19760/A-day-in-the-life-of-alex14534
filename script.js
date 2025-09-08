import { DiscordSDK } from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK("YOUR_CLIENT_ID");

async function setup() {
  await discordSdk.ready();
  await discordSdk.commands.authenticate();
  console.log("Activity running!");
}

setup();
