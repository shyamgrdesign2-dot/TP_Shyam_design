import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Switch, Empty, Tooltip, Popconfirm } from "antd";
import { rssiToBars, rssiToLabel } from "../../utils/neoConsultationUtils";
import {
  NeoMicIcon,
  NeoCloseIcon,
  NeoFlashIcon,
  NeoCheckCircleIcon,
  NeoRefreshIcon,
  NeoTrashIcon,
  NeoBluetoothIcon,
  NeoBulbIcon,
} from "./icons";
import "./NeoConsultation.scss";

function SignalBars({ rssi, color = "#7c3aed" }) {
  const bars = rssiToBars(rssi);
  const heights = [5, 8, 11, 14];
  return (
    <span className="neo-pair-modal__signal" aria-label={rssiToLabel(rssi)}>
      {heights.map((h, i) => (
        <span
          key={h}
          className="neo-pair-modal__signal-bar"
          style={{
            height: h,
            background: i < bars ? color : "#cbd5e1",
          }}
        />
      ))}
    </span>
  );
}

function BatteryIndicator({ percent }) {
  if (percent == null) return null;
  const fillColor =
    percent >= 50 ? "#16a34a" : percent >= 20 ? "#f59e0b" : "#ef4444";
  return (
    <span className="neo-pair-modal__battery" aria-label={`${percent}% battery`}>
      <span className="neo-pair-modal__battery-shell">
        <span
          className="neo-pair-modal__battery-fill"
          style={{ width: `${percent}%`, background: fillColor }}
        />
      </span>
      <span className="neo-pair-modal__battery-cap" />
      <span className="neo-pair-modal__battery-pct">{percent}%</span>
    </span>
  );
}

function DeviceRow({
  device,
  isConnected,
  isPairing,
  isAnotherPairing,
  onToggle,
  onForget,
  showForget,
}) {
  const name = device.name || "Neo device";
  const tag = device.address?.slice(-4)?.toUpperCase();
  const labelId = `NEO-${tag || "device"}`;

  return (
    <div
      className={`neo-pair-modal__device${
        isConnected ? " neo-pair-modal__device--connected" : ""
      }`}
    >
      <div className="neo-pair-modal__device-avatar">
        <NeoMicIcon size={20} />
      </div>

      <div className="neo-pair-modal__device-main">
        <div className="neo-pair-modal__device-name">{name}</div>
        <div className="neo-pair-modal__device-meta">
          <span
            className={`neo-pair-modal__device-status${
              isConnected
                ? " neo-pair-modal__device-status--on"
                : " neo-pair-modal__device-status--off"
            }`}
          >
            <span className="neo-pair-modal__device-dot" />
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span className="neo-pair-modal__device-id">· {labelId}</span>
        </div>

        {isConnected && (
          <div className="neo-pair-modal__device-stats">
            <BatteryIndicator percent={device.batteryPercent} />
            <Tooltip
              title={
                device.rssi != null
                  ? `RSSI ${device.rssi} dBm`
                  : "Signal unknown"
              }
            >
              <span className="neo-pair-modal__device-signal-wrap">
                <SignalBars rssi={device.rssi} />
                <span className="neo-pair-modal__device-signal-label">
                  {rssiToLabel(device.rssi)}
                </span>
              </span>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="neo-pair-modal__device-actions">
        {showForget && (
          <Popconfirm
            title="Forget this Neo?"
            description="You'll need to re-pair to use it again."
            okText="Forget"
            cancelText="Cancel"
            onConfirm={() => onForget?.(device)}
          >
            <Tooltip title="Forget device">
              <Button
                size="small"
                type="text"
                danger
                icon={<NeoTrashIcon size={16} />}
              />
            </Tooltip>
          </Popconfirm>
        )}
        <Switch
          checked={isConnected}
          loading={isPairing}
          disabled={isAnotherPairing}
          onChange={(checked) => onToggle(device, checked)}
        />
      </div>
    </div>
  );
}

function NeoPairingModal({
  open,
  onClose,
  pairedDevice,
  deviceAddress = "",
  scanResults = [],
  isScanning = false,
  isPairing = false,
  pairingError = "",
  serverReachable = true,
  isConnected = false,
  isSpeaking = false,
  onScan,
  onToggleDevice,
  onForget,
}) {
  useEffect(() => {
    if (open && serverReachable && !isScanning && scanResults.length === 0) {
      onScan?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lightweight elapsed-seconds counter for the "Scanning for Ns" caption.
  // Resets every time a new scan starts; stops the moment scanning ends so
  // we don't keep ticking while results are visible.
  const [scanSeconds, setScanSeconds] = useState(0);
  const scanStartedAtRef = useRef(null);
  useEffect(() => {
    if (!isScanning) {
      scanStartedAtRef.current = null;
      setScanSeconds(0);
      return undefined;
    }
    scanStartedAtRef.current = Date.now();
    setScanSeconds(0);
    const id = setInterval(() => {
      const start = scanStartedAtRef.current;
      if (start) setScanSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isScanning]);

  const mergedDevices = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (pairedDevice?.address) {
      list.push({
        ...pairedDevice,
        rssi: pairedDevice.rssi ?? null,
        batteryPercent: pairedDevice.batteryPercent ?? null,
      });
      seen.add(pairedDevice.address);
    }

    // Bridge auto-reconnected (status: "already_connected" / "connected")
    // before the user ever paired through the modal — pairedDevice is null
    // but we still have a live BLE address. Synthesize a row so the toggle
    // is visible and the user can turn the device OFF.
    if (isConnected && deviceAddress && !seen.has(deviceAddress)) {
      list.push({
        address: deviceAddress,
        name: "Neo",
        rssi: null,
        batteryPercent: null,
      });
      seen.add(deviceAddress);
    }

    scanResults.forEach((d) => {
      if (d?.address && !seen.has(d.address)) {
        list.push(d);
        seen.add(d.address);
      }
    });
    return list;
  }, [pairedDevice, deviceAddress, isConnected, scanResults]);

  const connectedCount =
    isConnected && (pairedDevice || deviceAddress) ? 1 : 0;

  const statusText = connectedCount
    ? `${connectedCount} device connected and ready`
    : isScanning
    ? "Looking for nearby Neo devices…"
    : "No devices connected";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      className="neo-pair-modal neo-pair-modal--v2"
      destroyOnClose
      centered
      maskClosable={!isPairing}
      closable={false}
    >
      <div className="neo-pair-modal__hero">
        <Button
          className="neo-pair-modal__hero-close"
          type="text"
          icon={<NeoCloseIcon size={18} />}
          onClick={onClose}
          disabled={isPairing}
          aria-label="Close"
        />
        <div className="neo-pair-modal__hero-content">
          <div className="neo-pair-modal__hero-icon">
            <NeoMicIcon size={22} />
          </div>
          <div>
            <div className="neo-pair-modal__hero-title">Connect Neo Device</div>
            <div className="neo-pair-modal__hero-subtitle">
              Smart diagnostic tools for your clinic
            </div>
          </div>
        </div>
        <div
          className={`neo-pair-modal__status-pill${
            connectedCount
              ? " neo-pair-modal__status-pill--on"
              : ""
          }${isSpeaking ? " neo-pair-modal__status-pill--listening" : ""}`}
        >
          {connectedCount ? (
            <NeoCheckCircleIcon size={16} />
          ) : (
            <NeoFlashIcon size={16} />
          )}
          <span>{statusText}</span>
          {isScanning && !connectedCount && (
            <span
              className="neo-pair-modal__status-pill-bar"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <div className="neo-pair-modal__body">
        {!serverReachable && (
          <div className="neo-pair-modal__warning">
            <strong>Neo bridge not running.</strong> Start <code>ws_server.py</code>{" "}
            on <code>localhost:8081</code> and try again.
          </div>
        )}

        <div className="neo-pair-modal__section-header">
          <span className="neo-pair-modal__section-title">
            AVAILABLE DEVICES
            {mergedDevices.length > 0 && ` (${mergedDevices.length})`}
          </span>
          {isScanning ? (
            <span className="neo-pair-modal__scan-pill" aria-live="polite">
              <span
                className="neo-pair-modal__scan-pill-ring"
                aria-hidden="true"
              />
              Scanning
            </span>
          ) : (
            <Button
              icon={<NeoRefreshIcon size={14} />}
              onClick={onScan}
              disabled={isPairing || !serverReachable}
              className="neo-pair-modal__scan-btn"
            >
              {mergedDevices.length > 0 ? "Re-scan" : "Scan"}
            </Button>
          )}
        </div>

        <div className="neo-pair-modal__device-list">
          {mergedDevices.map((device) => {
            // Match by the live BLE address the bridge reported (deviceAddress)
            // OR by the pairedDevice record stored in the hook — whichever is set.
            const isThisConnected =
              isConnected &&
              (deviceAddress === device.address ||
                (pairedDevice && pairedDevice.address === device.address));
            const pairingThisRow =
              isPairing && pairedDevice?.address === device.address;
            const pairingDifferentRow =
              isPairing &&
              pairedDevice?.address &&
              pairedDevice.address !== device.address;
            return (
              <DeviceRow
                key={device.address}
                device={device}
                isConnected={isThisConnected}
                isPairing={pairingThisRow}
                isAnotherPairing={pairingDifferentRow}
                onToggle={onToggleDevice}
                onForget={onForget}
                showForget={
                  !!pairedDevice && pairedDevice.address === device.address
                }
              />
            );
          })}

          {/* Big scanning showcase — only when scanning AND no devices yet.
              Once any row is present (paired/live/scan-result) the inline
              "looking for more devices" spinner takes over below the list. */}
          {isScanning && mergedDevices.length === 0 && (
            <div
              className="neo-pair-modal__scan-showcase"
              role="status"
              aria-live="polite"
            >
              <div className="neo-pair-modal__scan-showcase-iconwrap">
                <span
                  className="neo-pair-modal__scan-showcase-ripple neo-pair-modal__scan-showcase-ripple--lg"
                  aria-hidden="true"
                />
                <span
                  className="neo-pair-modal__scan-showcase-ripple"
                  aria-hidden="true"
                />
                <div className="neo-pair-modal__scan-showcase-icon">
                  <NeoBluetoothIcon size={26} />
                </div>
              </div>
              <div className="neo-pair-modal__scan-showcase-title">
                Looking for Neo devices…
              </div>
              <div className="neo-pair-modal__scan-showcase-sub">
                Scanning for {scanSeconds}s
              </div>
            </div>
          )}

          {isScanning && mergedDevices.length > 0 && (
            <div className="neo-pair-modal__scanning neo-pair-modal__scanning--inline">
              <span
                className="neo-pair-modal__scan-pill-ring"
                aria-hidden="true"
              />
              <span>Looking for more Neo devices…</span>
            </div>
          )}

          {!isScanning && mergedDevices.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No Neo devices found.
                  <br />
                  Make sure the device LED is solid and press Scan.
                </span>
              }
            />
          )}
        </div>

        {pairingError && (
          <div className="neo-pair-modal__error">{pairingError}</div>
        )}

        <div className="neo-pair-modal__hint">
          <span className="neo-pair-modal__hint-icon" aria-hidden="true">
            <NeoBulbIcon size={14} color="#7c3aed" />
          </span>
          <span>
            Ensure Neo devices are powered on and within{" "}
            <strong>10 meters</strong> of this computer. Bluetooth must be
            enabled on your system.
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default NeoPairingModal;
