---
name: qr-code
description: Create scannable QR codes with the create_qr_code tool. Use when the user asks for a QR code or barcode-style link for a website, menu, Wi-Fi network, contact/business card, email, text message, phone number, map location or any text.
---

# QR Code Generator

Always use `create_qr_code`. Image generation can't make QR codes that scan.

## Choose the kind

| The user wants | kind | Fill in |
|---|---|---|
| A website, menu, review page, payment link | `url` | `text`: the link |
| Guests to join Wi-Fi | `wifi` | `wifi.ssid`, `wifi.password`, `wifi.security` (`WPA` unless they say WEP or open/`none`) |
| A business card / save my contact | `contact` | `contact.name` plus any of phone, email, organization, title, url, address |
| Someone to email them | `email` | `email.to`, optional subject and body |
| Someone to text them | `sms` | `sms.phone`, optional message |
| Someone to call them | `phone` | `text`: the number in international format, e.g. +14155550100 |
| A place on a map | `location` | `location.latitude`, `location.longitude` |
| Anything else | `text` | `text` |

Ask for missing essentials, such as the Wi-Fi password or the link itself, instead of guessing.

## Good defaults

- Add a short `label` when the code will be printed, e.g. "Scan for our menu" or "Join our Wi-Fi".
- Keep `foreground` dark and `background` light. Brand colours are fine if contrast stays high.
- Use `error_correction: "H"` for codes printed small, on fabric, packaging or curved surfaces; otherwise keep `M`.
- Long links make dense codes. If the tool warns about density, suggest a shorter link.

## After creating

Confirm in one sentence what the code does and mention the PNG/SVG download buttons. Pass on any warnings from the tool. Suggest testing the printed code with a phone camera before printing many copies.
