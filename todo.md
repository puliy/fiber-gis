# FiberGIS — Project TODO

## Phase 1: Database Schema & Project Structure
- [x] Initialize project with web-db-user scaffold
- [x] Design and apply PostgreSQL schema (regions, map_points, cables, cable_ducts, buildings, audit_log)
- [x] Audit log tables
- [x] Seed data: sample regions and objects

## Phase 2: Backend (tRPC Routers)
- [x] Regions router: list, create, update, delete
- [x] Map points router: list by bounds, create, update, delete
- [x] Cables router: list by bounds, create, update, delete
- [x] Buildings router: list by bounds
- [x] Audit log router: list history for object
- [x] Public map router: token-based read-only access
- [x] Admin user management router
- [x] Cable templates router

## Phase 3: Frontend (React + Leaflet)
- [x] Install leaflet + react-leaflet dependencies
- [x] Design system: dark sidebar + light map layout
- [x] Map page: Leaflet map with OSM/Satellite/Carto base layers
- [x] Region selector: dropdown to switch city/district
- [x] Map toolbar: add pole, manhole, splice, node, cable, building tools
- [x] Object popup: view/edit/delete attributes on click
- [x] Layer panel: toggle visibility of object types
- [x] Viewport-based loading: reload objects on map move/zoom
- [x] Mobile-responsive layout (Sheet sidebar for mobile)
- [x] Admin panel: user management, roles
- [x] Templates page: cable type management
- [x] Public map page: token-based read-only view

## Phase 4: Access Control, Tests & Polish
- [x] Role-based access: admin/user/viewer permissions
- [x] Vitest: 16 backend tests passing
- [x] UI polish: MapToolbar icons (lucide-react instead of text abbreviations)
- [x] UI polish: Add search/find object on map (Ctrl+F, inline dropdown)
- [x] UI polish: Improve CreateObjectDialog with cable template selector
- [ ] UI polish: Add cable duct (кабельная канализация) drawing tool
- [ ] Add Yandex Maps tile layer option
- [ ] Docker Compose config for Selectel deployment
- [ ] README with deployment instructions

## Этап 2: Учёт волокон и оптические кроссы

### БД схема
- [x] cable_templates + cable_modules + cable_fibers (шаблоны кабелей)
- [x] fiber_colors — справочник цветов IEC 60304 (12 цветов)
- [x] splice_closures + fiber_splices — муфты и сварки
- [ ] optical_crosses + cross_ports + port_connections — кроссы

### Бэкенд
- [x] tRPC: cableTemplates CRUD (модули, волокна, цвета)
- [x] tRPC: spliceClosure CRUD + fiber_splices
- [ ] tRPC: opticalCross CRUD + порты + коммутация
- [ ] tRPC: fibers.trace — трассировка волокна по маршруту

### Фронтенд
- [x] TemplatesPage — полный CRUD шаблонов (модули/волокна/цвета)
- [x] SplicePassportPage — страница паспорта муфты со списком сварок
- [ ] CrossPage — страница кросса: схема портов и коммутации
- [ ] FiberTrace — трассировка волокна на карте

## Этап 3: Активное оборудование
- [ ] Оптические кроссы (патч-панели, порты, коммутация)
- [ ] Активное оборудование (OLT, коммутаторы, ONT)
- [ ] Сплиттеры GPON

## Этап 4: Отчёты и деплой
- [ ] Экспорт отчётов в Excel/PDF
- [ ] Docker Compose для Selectel VPS
- [ ] CI/CD GitHub Actions
