# ADR 0005: Connect to DC1 through BLE FTMS

- Status: accepted
- Date: 2026-09-22

## Context

DC1の公式製品情報にはBLE FTMSとANT+ FE-C対応が記載されている。現在のアプリは単一HTMLを直接開く構成だが、Web Bluetoothは安全なコンテキストを要求し、ローカルファイルからの接続はできない。

## Decision

ブラウザ実装ではWeb BluetoothのBLE FTMSを使う。接続開始はユーザー操作に限定し、Fitness Machine Service `0x1826` のIndoor Bike Data `0x2AD2`通知を購読する。最初の段階では抵抗値を書き込まず、受信データの表示とログ記録だけを行う。

アプリは `localhost` またはHTTPSで配信する。ANT+ FE-CはWeb Bluetoothでは扱わず、必要になった場合はネイティブアプリまたはローカルブリッジを追加する。

## Consequences

- Chrome/EdgeなどWeb Bluetooth対応ブラウザとBluetooth権限が必要
- `file://` のままでは接続できない
- FTMSのフラグに従うパケットパーサーが必要
- DC1固有の未公開拡張に依存せず、標準サービスを優先できる
- ブラウザの制限によりANT+は別実装になる
