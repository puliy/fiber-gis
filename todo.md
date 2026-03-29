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
- [x] optical_crosses + cross_ports + port_connections — кроссы

### Бэкенд
- [x] tRPC: cableTemplates CRUD (модули, волокна, цвета)
- [x] tRPC: spliceClosure CRUD + fiber_splices
- [x] tRPC: opticalCross CRUD + порты + коммутация
- [x] tRPC: fiberTrace.trace — трассировка волокна по маршруту

### Фронтенд
- [x] TemplatesPage — полный CRUD шаблонов (модули/волокна/цвета)
- [x] SplicePassportPage — страница паспорта муфты со списком сварок
- [x] OpticalCrossPage — страница кросса: схема портов и коммутации
- [x] FiberTracePage — трассировка волокна через сварки

## Этап 3: Активное оборудование
- [ ] Оптические кроссы (патч-панели, порты, коммутация)
- [ ] Активное оборудование (OLT, коммутаторы, ONT)
- [ ] Сплиттеры GPON

## Этап 4: Отчёты и деплой
- [ ] Экспорт отчётов в Excel/PDF
- [ ] Docker Compose для Selectel VPS
- [ ] CI/CD GitHub Actions

## Баги
- [x] Левое боковое меню (тулбар инструментов) на карте не видно / не открывалось (исправлено: breakpoint md → sm, убрана обёртка тулбара)

## Этап 2 (продолжение)
- [x] Открытие паспорта муфты с карты (кнопка в попапе объекта типа Муфта)
- [x] Оптические кроссы: таблицы БД optical_crosses, cross_ports, port_connections
- [x] Оптические кроссы: tRPC роутеры CRUD
- [x] Оптические кроссы: UI страница схемы портов и коммутации

## Этап 3 — Трассировка волокна
- [x] Выбор кабель → модуль → волокно в UI (FiberTracePage)
- [x] Поиск маршрута волокна через сварки (traceFiber BFS)
- [x] Подсветка маршрута на карте (traceCoords через sessionStorage в FiberMap)

## Финальный этап — "Сделать всё до конца"

### Экспорт PDF
- [x] Кнопка "Скачать PDF" на странице паспорта муфты (/splice/:id) — window.print()
- [x] Кнопка "Скачать PDF" на странице кросса (/cross/:id) — window.print()

### Подсветка маршрута на карте
- [x] После трассировки — передача traceCoords через sessionStorage в FiberMap, полилиния Leaflet

### Диалог создания кросса
- [x] Диалог с выбором количества портов и типа (ODF/МОКС/ШКОС) в ObjectDialog

### Активное оборудование
- [x] БД: таблицы active_equipment + equip_ports + splitters
- [x] tRPC: activeEquipment CRUD + splitters CRUD
- [x] UI: страница EquipmentPage (/equipment) — оборудование и сплиттеры по региону
- [x] Карта: пункт "Активное оборудование" в меню MapPage

### Сводные отчёты
- [x] Экспорт инфраструктуры по региону в Excel (/api/reports/infrastructure/:regionId) — 5 листов
- [x] Кнопка "Скачать отчёт Excel" в меню MapPage

## Финальный этап 2 — "Сделать всё до конца"

### Привязка оборудования к карте
- [x] Попап узла: кнопка "Оборудование" в ObjectDialog → /equipment?pointId=X
- [x] Кнопка "Открыть оборудование" в попапе добавлена (EquipmentButton)

### Кабельная канализация
- [x] БД: таблица cable_ducts (уже была в миграции 0001)
- [x] tRPC: cableDucts CRUD (byRegion, byBounds, byId, upsert, delete)
- [x] Карта: инструмент add_duct в MapToolbar + рисование полилиний в FiberMap
- [x] Слой "Канализация" в FiberMap (зелёные полилинии с толщиной 4px)

### Docker Compose + README
- [x] docker-compose.yml (Node.js + Nginx + MySQL)
- [x] Dockerfile (двухэтапная сборка: builder + runner)
- [x] nginx.conf с SSL-проксированием
- [x] DEPLOY.md с пошаговой инструкцией для Selectel/Timeweb

## Новые задачи (сессия 3)

### Импорт из Excel/CSV
- [x] tRPC: mapPoints.importBatch — массовое создание объектов из массива
- [x] UI: страница /import с загрузкой файла, preview таблицы, кнопкой импорта
- [x] Шаблон Excel для скачивания (колонки: name, type, lat, lng, address, status)
- [x] Валидация строк (тип, координаты) с отчётом об ошибках

### Публичная карта — улучшенный UI
- [x] Переработать PublicMapPage: полноэкранная карта с легендой, поиском, слоями
- [x] Показывать все типы объектов с иконками (как в основной карте)
- [x] Информационная панель: название региона, статистика объектов
- [x] Кнопка "Открыть в FiberGIS" (ссылка на основной сайт)

### DEPLOY.md для Timeweb Cloud + fibergis.ru
- [x] Инструкция для Timeweb Cloud VPS (Ubuntu 24.04)
- [x] Привязка домена fibergis.ru к серверу (A-запись 188.225.84.38)
- [x] SSL через Let's Encrypt (certbot) — команда в DEPLOY.md
- [x] Docker Compose запуск + автозапуск через systemd
- [x] Настройка MySQL в Docker (docker-compose.yml)

## Сессия 4 — Полная доработка до уровня демо

### Фаза 1: Исправление рисования здания и кабеля
- [x] Исправить рисование здания: начинать с первой точки, замыкать двойным кликом, сохранять
- [x] Исправить сохранение кабеля (убедиться что CreateObjectDialog корректно вызывается)
- [x] Улучшить UX рисования здания: показывать предварительный контур, кнопка отмены

### Фаза 2: Плавающий тулбар
- [x] Сделать MapToolbar перетаскиваемым (drag-and-drop) по экрану
- [x] Сохранять позицию тулбара в localStorage
- [x] Увеличить размер кнопок тулбара

### Фаза 3: Новые инструменты тулбара
- [x] Добавить инструмент add_mast (Мачта) в MapToolbar
- [x] Добавить инструмент add_entry_point (Точка ввода) в MapToolbar
- [x] Добавить инструмент add_flag (Флаг) в MapToolbar
- [x] Добавить инструмент add_camera (Камера) в MapToolbar

### Фаза 4: Snap кабеля + вкладка Кабели
- [x] При завершении рисования кабеля — автоматически находить ближайшую точку в радиусе 30м и сохранять startPointId/endPointId
- [x] Добавить вкладку "Кабели" в ObjectDialog для точек (список кабелей через точку)
- [x] Бэкенд: cables.byPoint — список кабелей, начинающихся или заканчивающихся в точке

### Фаза 5: Управление регионами + isPublic + роль editor
- [x] AdminPage: вкладка "Регионы" — список, создание нового региона (форма)
- [x] ObjectDialog: чекбокс isPublic в форме редактирования точки и кабеля
- [x] AdminPage: добавить роль "editor" в список ролей при смене роли пользователя

### Фаза 6: Фильтр на карте + статистика
- [x] Отдельная панель фильтров на карте (по статусу: Факт/План/Демонтаж, по типу объекта)
- [x] Применять фильтры к отображаемым точкам и кабелям на карте
- [x] AdminPage: статистика по объектам региона (кол-во точек по типам, кабели, длина)
