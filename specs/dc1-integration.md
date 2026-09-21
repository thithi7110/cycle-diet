# DC1 Integration Specification

## Supported connection path

CYCPLUSの公式製品情報では、DC1は `BLE FTMS` と `ANT+ FE-C` に対応している。ブラウザアプリではWeb Bluetooth APIを使うため、MVPの接続方式はBLE FTMSとする。ANT+はブラウザ標準APIの対象外なので、後続のネイティブブリッジ候補とする。

## Browser prerequisites

- `file://` ではWeb Bluetoothを使えない
- `http://localhost` またはHTTPSでアプリを配信する
- Bluetoothが有効な対応ブラウザを使う
- DC1を起動し、ブラウザのBluetooth権限ダイアログで選択する
- VS Code内蔵ブラウザやCYCPLUS Fitなど、別のアプリでDC1を接続中なら先に切断する。DC1は同時接続の影響で他のChromeから見えないことがある
- Web Bluetooth APIが利用できる環境であること

## GATT contract

Use the Bluetooth SIG Fitness Machine Service:

- Service: `0x1826` Fitness Machine Service
- Indoor Bike Data: `0x2AD2` Notify
- Fitness Machine Control Point: `0x2AD9` Write/Indicate, only when control is needed
- Fitness Machine Feature: `0x2ACC` Read, optional capability check

The first integration only subscribes to Indoor Bike Data and does not change resistance.

## Data mapping

- Instantaneous speed -> display/debug only
- Instantaneous cadence -> activity record and live UI
- Instantaneous power -> activity record and live UI
- Expended energy -> calories used for the fat conversion
- Elapsed time -> session duration
- Total distance -> activity summary when present

The Indoor Bike Data flags must be parsed before reading optional fields. Values and offsets must follow the FTMS characteristic definition rather than assuming a fixed packet layout.

## Product behavior

- The user explicitly presses `DC1に接続` before requesting a device
- The picker filters to devices whose name starts with `CYCPLUS`
- The app shows connection state and device name
- Notifications update the live metrics without replacing manual log entry
- Disconnect or unsupported services show a recoverable error
- Until a real packet is received, the existing demo data remains visible
