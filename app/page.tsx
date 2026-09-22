'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const FTMS_SERVICE = 0x1826;
const INDOOR_BIKE_DATA = 0x2ad2;
const today = '2026-09-22';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<'today' | 'total'>('today');
  const [user, setUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState('デモモード');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [speed, setSpeed] = useState<number | null>(null);
  const [cadence, setCadence] = useState<number | null>(null);
  const [power, setPower] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [zoom, setZoom] = useState(1);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const sessionCaloriesRef = useRef<number | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const dropStateRef = useRef({ target: 0, count: 0, timer: 0, energyKcal: 0, lastFtmsTime: null as number | null, speed: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const zoomControlsRef = useRef<HTMLDivElement>(null);
  const updateFatVisualRef = useRef<(grams: number) => void>(() => {});

  const saveLog = async (date: string, calories: number) => {
    if (!supabaseRef.current || !user) return;
    await supabaseRef.current.from('daily_logs').upsert({ user_id: user.id, log_date: date, calories }, { onConflict: 'user_id,log_date' });
  };

  useEffect(() => {
    const supabase = getSupabase();
    supabaseRef.current = supabase;
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthMessage(data.session?.user ? `${data.session.user.email} で保存中` : 'ログインすると個人保存');
      if (data.session?.user) {
        const { data: rows } = await supabase.from('daily_logs').select('log_date,calories').eq('user_id', data.session.user.id);
        if (rows) setLogs(Object.fromEntries(rows.map((row) => [row.log_date, Number(row.calories)])));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthMessage(session?.user ? `${session.user.email} で保存中` : 'ログインすると個人保存');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = sceneHostRef.current;
    if (!canvas || !host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
    camera.position.set(0, .1, 6.4);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const fatGroup = new THREE.Group();
    const referenceGroup = new THREE.Group();
    referenceGroup.position.set(.88, -.08, .15);
    scene.add(fatGroup, referenceGroup);
    const fatDropGroup = new THREE.Group();
    scene.add(fatDropGroup);
    const fatDropGeometry = new THREE.SphereGeometry(.16, 16, 10);
    const fatDropMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf1c766, roughness: .5, clearcoat: .2, clearcoatRoughness: .4 });
    const fallingDrops: { mesh: THREE.Mesh; start: THREE.Vector3; target: THREE.Vector3; duration: number; elapsed: number }[] = [];
    const fatSurfaceRaycaster = new THREE.Raycaster();
    const dropWorldPosition = new THREE.Vector3();
    const dropRayOrigin = new THREE.Vector3();
    const downDirection = new THREE.Vector3(0, -1, 0);
    const dropState = dropStateRef.current;
    const spawnFatDrop = () => {
      if (dropState.speed <= 0 || dropState.count >= dropState.target || fallingDrops.length >= 1) return;
      const drop = new THREE.Mesh(fatDropGeometry, fatDropMaterial);
      drop.position.set((Math.random() - .5) * 2.1, 3.25 + Math.random() * .45, (Math.random() - .5) * .85);
      drop.scale.set(.7 + Math.random() * .35, 1.25 + Math.random() * .5, .7 + Math.random() * .35);
      fatDropGroup.add(drop);
      fallingDrops.push({ mesh: drop, start: drop.position.clone(), target: new THREE.Vector3((Math.random() - .5) * .7, Math.random() * .12 - .06, 0), duration: 2.6 + Math.random() * 2.1, elapsed: 0 });
      dropState.count += 1;
    };
    const updateFatDrops = (delta: number) => {
      dropState.timer -= delta;
      if (dropState.timer <= 0) { spawnFatDrop(); dropState.timer = 1.2 + Math.random() * 3.2; }
      for (let index = fallingDrops.length - 1; index >= 0; index -= 1) {
        const fallingDrop = fallingDrops[index];
        fallingDrop.elapsed += delta;
        const progress = Math.min(fallingDrop.elapsed / fallingDrop.duration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        fallingDrop.mesh.position.lerpVectors(fallingDrop.start, fallingDrop.target, eased);
        fallingDrop.mesh.rotation.z += delta * 2;
        fallingDrop.mesh.scale.y = (1.25 + Math.random() * .08) * (1 - progress * .45);
        fallingDrop.mesh.getWorldPosition(dropWorldPosition);
        dropRayOrigin.copy(dropWorldPosition).addScaledVector(downDirection, -.04);
        fatSurfaceRaycaster.set(dropRayOrigin, downDirection);
        const intersections = fatSurfaceRaycaster.intersectObject(fatGroup, true);
        const surfaceDistance = intersections.length ? intersections[0].distance : Infinity;
        const contactDistance = .16 * fatDropGroup.scale.y * 1.35;
        if (surfaceDistance <= contactDistance || progress >= 1) { fatDropGroup.remove(fallingDrop.mesh); fallingDrops.splice(index, 1); }
      }
    };
    scene.add(new THREE.HemisphereLight(0xfff7d9, 0x9aaf94, 2.8));
    const key = new THREE.DirectionalLight(0xfff1c6, 3.4); key.position.set(-3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xd6e8bd, 1.5); rim.position.set(4, 1, -3); scene.add(rim);
    const fallback = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8d2a0, roughness: .82 }));
    fallback.scale.set(1.48, .68, .95); fatGroup.add(fallback);
    const loader = new GLTFLoader();
    const loadModel = (path: string, target: THREE.Group, heightAxis: 'x' | 'y' = 'x', heightTarget = 2.96) => loader.load(`/${path}`, (gltf) => {
      const model = gltf.scene; const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center); model.scale.setScalar(heightTarget / Math.max(heightAxis === 'x' ? size.x : size.y, .001)); model.traverse((part) => { if ((part as THREE.Mesh).isMesh) { part.castShadow = true; part.receiveShadow = true; } }); target.clear(); target.add(model);
    });
    loadModel('pet-bottle-500ml.glb', referenceGroup, 'y', 1.52);
    const fatAssetCache = new Map<string, THREE.Group>();
    const loadFatAsset = (path: string): Promise<THREE.Group | null> => new Promise((resolve) => {
      const cached = fatAssetCache.get(path);
      if (cached) { resolve(cached.clone(true) as THREE.Group); return; }
      loader.load(`/${path}`, (gltf) => {
        const asset = gltf.scene; const box = new THREE.Box3().setFromObject(asset); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
        asset.position.sub(center); asset.scale.setScalar(2.96 / Math.max(size.x, size.y, size.z, .001));
        asset.traverse((part) => { if ((part as THREE.Mesh).isMesh) { part.castShadow = true; part.receiveShadow = true; } });
        fatAssetCache.set(path, asset); resolve(asset.clone(true) as THREE.Group);
      }, undefined, () => resolve(null));
    });
    let activeFatReference = 0;
    updateFatVisualRef.current = async (grams: number) => {
      const desiredReference = grams >= 100 ? 100 : 10;
      if (activeFatReference !== desiredReference) {
        activeFatReference = desiredReference;
        const asset = await loadFatAsset(desiredReference === 100 ? 'adipose-100g.glb' : 'adipose-10g.glb');
        if (asset) { fatGroup.clear(); fatGroup.add(asset); }
      }
      const modelScale = Math.max(.075, .105 * Math.cbrt(Math.max(grams, .1) / desiredReference));
      fatGroup.scale.set(modelScale, modelScale, modelScale);
    };
    const resize = () => { const box = host.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / box.height; camera.updateProjectionMatrix(); };
    resize(); window.addEventListener('resize', resize);
    let dragging = false; let last = { x: 0, y: 0 };
    const down = (event: PointerEvent) => { dragging = true; last = { x: event.clientX, y: event.clientY }; host.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; fatGroup.rotation.y += (event.clientX - last.x) * .01; fatGroup.rotation.x += (event.clientY - last.y) * .01; last = { x: event.clientX, y: event.clientY }; };
    const up = () => { dragging = false; };
    host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move); host.addEventListener('pointerup', up);
    const wheel = (event: WheelEvent) => { event.preventDefault(); setZoom((current) => Math.min(3, Math.max(.5, current * (event.deltaY < 0 ? 1.08 : .93)))); };
    host.addEventListener('wheel', wheel, { passive: false });
    const zoomControls = zoomControlsRef.current;
    const stopZoomPropagation = (event: PointerEvent) => event.stopPropagation();
    zoomControls?.addEventListener('pointerdown', stopZoomPropagation);
    let frame = 0; let previousFrame = performance.now();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - previousFrame) / 1000, .05);
      previousFrame = now;
      fatDropGroup.rotation.copy(fatGroup.rotation);
      fatDropGroup.scale.copy(fatGroup.scale);
      updateFatDrops(delta);
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('wheel', wheel); zoomControls?.removeEventListener('pointerdown', stopZoomPropagation); updateFatVisualRef.current = () => {}; fatDropGeometry.dispose(); fatDropMaterial.dispose(); renderer.dispose(); };
  }, []);

  const connect = async () => {
    if (!navigator.bluetooth) return setAuthMessage('Web Bluetooth非対応');
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'CYCPLUS' }], optionalServices: [FTMS_SERVICE] });
      deviceRef.current = device; const server = await device.gatt?.connect(); const service = await server?.getPrimaryService(FTMS_SERVICE); const characteristic = await service?.getCharacteristic(INDOOR_BIKE_DATA);
      if (!characteristic) throw new Error('FTMSデータ特性を取得できません');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const data = (event.target as BluetoothRemoteGATTCharacteristic).value; if (!data) return;
        const flags = data.getUint16(0, true); let offset = 2;
        let speedValue: number | undefined; let cadenceValue: number | undefined; let powerValue: number | undefined;
        if ((flags & 1) === 0) { speedValue = data.getUint16(offset, true) / 100; setSpeed(speedValue); offset += 2; } if (flags & 2) offset += 2;
        if (flags & 4) { cadenceValue = data.getUint16(offset, true) / 2; setCadence(cadenceValue); offset += 2; } if (flags & 8) offset += 2; if (flags & 16) offset += 3; if (flags & 32) offset += 2; if (flags & 64) { powerValue = data.getInt16(offset, true); setPower(powerValue); offset += 2; }
        if (flags & 128) offset += 2;
        if (speedValue !== undefined || cadenceValue !== undefined || powerValue !== undefined) {
          const dropState = dropStateRef.current;
          if (speedValue !== undefined) dropState.speed = speedValue;
          const now = performance.now();
          const elapsedSeconds = dropState.lastFtmsTime === null ? 0 : Math.min((now - dropState.lastFtmsTime) / 1000, 2);
          dropState.lastFtmsTime = now;
          if (speedValue !== undefined && speedValue > 0 && elapsedSeconds > 0) {
            dropState.energyKcal += speedValue * elapsedSeconds / 360;
            const newDropUnits = Math.floor(dropState.energyKcal * 10);
            if (newDropUnits > 0) { dropState.target += newDropUnits; dropState.energyKcal -= newDropUnits / 10; }
          }
        }
        if (flags & 256 && offset + 2 <= data.byteLength) { const calories = data.getUint16(offset, true); if (sessionCaloriesRef.current === null) sessionCaloriesRef.current = calories; else if (calories >= sessionCaloriesRef.current) { const delta = calories - sessionCaloriesRef.current; if (delta) { const next = (logsRef.current[selectedDate] || 0) + delta; setLogs((current) => ({ ...current, [selectedDate]: next })); saveLog(selectedDate, next); } sessionCaloriesRef.current = calories; } }
      });
      device.addEventListener('gattserverdisconnected', () => { setConnected(false); dropStateRef.current.speed = 0; }); setConnected(true); sessionCaloriesRef.current = null;
      dropStateRef.current.energyKcal = 0; dropStateRef.current.lastFtmsTime = null; dropStateRef.current.speed = 0;
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : '接続に失敗しました'); }
  };
  const totalCalories = Object.values(logs).reduce((sum, value) => sum + value, 0);
  const selectedCalories = logs[selectedDate] || 0;
  const visibleFat = view === 'today' ? selectedCalories * .125 : totalCalories * .125;
  useEffect(() => { updateFatVisualRef.current(visibleFat); }, [visibleFat]);
  useEffect(() => { if (cameraRef.current) cameraRef.current.position.z = 6.4 / zoom; }, [zoom]);
  const calendarDays = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
  const submitAuth = async (mode: 'signIn' | 'signUp') => { if (!supabaseRef.current) return setAuthMessage('NEXT_PUBLIC_SUPABASE_* を設定してください'); const result = mode === 'signIn' ? await supabaseRef.current.auth.signInWithPassword({ email, password }) : await supabaseRef.current.auth.signUp({ email, password }); setAuthMessage(result.error?.message || (mode === 'signUp' ? '確認メールを送信しました' : 'ログインしました')); };
  const signInWithGoogle = async () => { if (!supabaseRef.current) return setAuthMessage('NEXT_PUBLIC_SUPABASE_* を設定してください'); const { error } = await supabaseRef.current.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); if (error) setAuthMessage(`Googleログイン失敗: ${error.message}`); };
  const addManualLog = async () => { const amount = Number((document.getElementById('calorieInput') as HTMLInputElement).value); if (!amount || amount < 1) return; const next = selectedCalories + amount; setLogs((current) => ({ ...current, [selectedDate]: next })); await saveLog(selectedDate, next); };

  return <div className="app-shell"><aside><div className="brand"><div className="brand-mark" /><div><strong>FAT / CYCLE</strong><small>DC1 LOG STUDIO</small></div></div><nav><button className="active">⌂<span>ダッシュボード</span></button><button>⌁<span>アクティビティ</span></button><button>◷<span>履歴</span></button></nav></aside><main><header className="topbar"><div><div className="eyebrow">TUESDAY / 22 SEP 2026</div><h1>脂肪の変化を、形にする。</h1><p className="subtitle">DC1のペダリングから、消費と積み重ねを可視化。</p></div><div className="actions"><div className={connected ? 'date connected' : 'date'}>{connected ? '● CYCPLUS DC1 CONNECTED' : '○ DC1 NOT CONNECTED'}</div><button className="connect-btn" onClick={connect}>{connected ? '接続済み' : 'DC1に接続'}</button>{!user ? <div className="auth-panel"><input placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} /><input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} /><button onClick={() => submitAuth('signIn')}>ログイン</button><button onClick={() => submitAuth('signUp')}>登録</button><button onClick={signInWithGoogle}>Google</button></div> : <div className="auth-panel"><button onClick={() => supabaseRef.current?.auth.signOut()}>ログアウト</button></div>}<p className="auth-status">{authMessage}</p></div></header><section className="grid"><article className="card visual-card"><div className="visual-head"><div className="eyebrow">LIVE 3D VISUALIZATION</div><h2>{view === 'today' ? '今日の脂肪' : '累積した脂肪'}</h2><p>{view === 'today' ? '今日の運動で消費した脂肪量' : 'これまでの運動で消費した脂肪量'}</p></div><div className="view-switch"><button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>今日</button><button className={view === 'total' ? 'active' : ''} onClick={() => setView('total')}>累積</button></div><div className="scene" ref={sceneHostRef}><canvas ref={canvasRef} aria-label="脂肪の3Dモデル" /><div className="scale-reference">500 mL<br />約21 cm</div><div className="zoom-controls" aria-label="3D表示の拡大縮小" ref={zoomControlsRef}><button type="button" aria-label="縮小" onClick={() => setZoom((current) => Math.max(.5, current / 1.25))}>-</button><span className="zoom-level">{zoom.toFixed(1)}x</span><button type="button" aria-label="倍率をリセット" onClick={() => setZoom(1)}>1:1</button><button type="button" aria-label="拡大" onClick={() => setZoom((current) => Math.min(3, current * 1.25))}>+</button></div></div><div className="scene-caption">3D / DRAG TO ROTATE <span>{visibleFat.toFixed(1)} g 脂肪</span></div></article><div className="side"><article className="card metric-card"><h3>本日の消費カロリー → 脂肪</h3><div className="metric-number"><strong>{selectedCalories}</strong><span>kcal</span></div><p className="helper">脂肪換算 <strong>{(selectedCalories * .125).toFixed(1)}</strong> g</p><div className="meter"><div style={{ width: `${Math.min(100, selectedCalories / 170 * 100)}%` }} /></div><div className="metric-foot"><span>目標 170 kcal</span><span>{Math.min(100, Math.round(selectedCalories / 170 * 100))}%</span></div><div className="speed-dashboard"><div><small>LIVE SPEED</small><strong>{speed === null ? '--' : speed.toFixed(1)} <span>km/h</span></strong></div><div className="live-stats"><span>{cadence === null ? '--' : cadence.toFixed(1)} rpm</span><span>{power === null ? '--' : power} W</span></div></div></article><article className="card metric-card"><h3>累積した脂肪</h3><div className="metric-number"><strong>{(totalCalories * .125).toFixed(1)}</strong><span>g</span></div><p className="helper">ログインするとユーザー別に保存されます。</p></article><article className="card calendar"><div className="calendar-head"><h3>運動カレンダー</h3><span>2026年 9月</span></div><div className="weekdays">月 火 水 木 金 土 日</div><div className="days">{calendarDays.map((date) => <button key={date} className={`${date === selectedDate ? 'selected ' : ''}${logs[date] ? 'has-log' : ''}`} onClick={() => setSelectedDate(date)}>{Number(date.slice(-2))}</button>)}</div><p className="calendar-note">{Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(-2))}日を表示中</p></article><article className="card entry-card"><h3>運動ログを追加</h3><div className="input-row"><label className="input-wrap"><input id="calorieInput" type="number" min="1" defaultValue="106" /><span>kcal</span></label><button className="log-btn" onClick={addManualLog}>記録する</button></div></article></div></section></main></div>;
}
