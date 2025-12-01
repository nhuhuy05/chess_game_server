# Chess Server

Server backend cho ứng dụng chơi cờ vua trực tuyến, được xây dựng với Node.js và Express.js.

## 📋 Mô tả

Chess Server là một RESTful API server cung cấp các chức năng:

- Xác thực người dùng (đăng ký, đăng nhập, đăng xuất)
- Quản lý matchmaking (ghép đôi người chơi)
- Quản lý game và nước đi
- Hệ thống bạn bè và thông báo
- Xếp hạng người chơi

## 🛠️ Công nghệ sử dụng

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Xác thực token
- **bcrypt** - Mã hóa mật khẩu
- **dotenv** - Quản lý biến môi trường

## 📦 Yêu cầu hệ thống

- Node.js >= 14.0.0
- MySQL >= 5.7
- npm hoặc yarn

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd chess_server
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình database

- Tạo database MySQL với tên `chess_db` (hoặc tên khác tùy chỉnh trong file config).
- Import file `database/schema.sql` để khởi tạo đầy đủ các bảng (`users`, `tokens`, `friendships`, `games`, `rankings`).

### 4. Cấu hình biến môi trường

Tạo file `.env` trong thư mục gốc:

```env
PORT=3000
ACCESS_TOKEN_SECRET=your-secret-key-here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=chess_db
```

**Lưu ý:** Thay đổi các giá trị phù hợp với môi trường của bạn, đặc biệt là `ACCESS_TOKEN_SECRET` và thông tin database.

## 📁 Cấu trúc dự án

```
chess_server/
├── node_modules/          # Dependencies
├── package.json           # Cấu hình dự án
├── package-lock.json      # Lock file
├── .env                   # Biến môi trường (tạo mới)
├── README.md              # Tài liệu dự án
└── src/                   # Source code
    ├── server.js          # Entry point - Khởi tạo Express server
    │
    ├── config/            # Cấu hình
    │   └── db.js          # Kết nối MySQL database
    │
    ├── controllers/       # Xử lý logic nghiệp vụ
    │   ├── authController.js    # Xử lý đăng ký, đăng nhập, đăng xuất
    │   └── gameController.js    # Xử lý matchmaking và game
    │
    ├── middlewares/       # Middleware
    │   └── authMiddleware.js    # Xác thực JWT token (protectedRoute)
    │
    ├── models/            # Data models (tương tác với database)
    │   ├── User.js        # Model người dùng
    │   ├── Game.js        # Model game
    │   ├── Move.js        # Model nước đi
    │   ├── Token.js       # Model refresh token
    │   ├── Friendship.js  # Model bạn bè
    │   ├── Notification.js # Model thông báo
    │   └── Ranking.js     # Model xếp hạng
    │
    ├── routes/            # Định nghĩa API routes
    │   ├── authRoute.js   # Routes: /api/auth
    │   └── gameRoute.js   # Routes: /api/matchmaking
    │
    └── services/          # Business logic services
```

## 🎯 API Endpoints

### Public Routes (Không cần xác thực)

#### Authentication

**POST** `/api/auth/signup`

- Đăng ký tài khoản mới
- Body:
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string",
    "displayName": "string"
  }
  ```
- Response: `204 No Content` (thành công)

**POST** `/api/auth/signin`

- Đăng nhập
- Body:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- Response:
  ```json
  {
    "massage": "User [displayName] đã đăng nhập",
    "accessToken": "string",
    "refreshToken": "string",
    "userId": "number",
    "displayName": "string"
  }
  ```

**POST** `/api/auth/signout`

- Đăng xuất
- Body: `refreshToken` (trong body hoặc cookie)
- Response: `204 No Content`

### Protected Routes (Cần xác thực JWT)

**Lưu ý:** Tất cả các route dưới đây cần header:

```
Authorization: Bearer <accessToken>
```

#### Matchmaking

**POST** `/api/matchmaking/join`

- Tham gia hàng đợi tìm trận đấu
- Body:
  ```json
  {
    "socketPort": "number" // Port mà client dự định dùng
  }
  ```
- Response:
  - `202 Accepted`: Đang tìm trận đấu
  - `200 OK`: Đã tìm thấy trận đấu
    ```json
    {
      "message": "Match Found!",
      "gameId": "number",
      "opponent": {
        "id": "number",
        "username": "string",
        "display_name": "string"
      },
      "color": "white" | "black"
    }
    ```

**GET** `/api/matchmaking/status`

- Kiểm tra trạng thái matchmaking
- Response:
  - `202 Accepted`: Đang tìm trận đấu
  - `200 OK`: Đã tìm thấy trận đấu (trả về thông tin tương tự như `/join`)
  - `404 Not Found`: Không tìm thấy yêu cầu

**DELETE** `/api/matchmaking/leave`

- Rời khỏi hàng đợi matchmaking
- Response: `204 No Content`

## 🏃 Chạy dự án

### Development mode (với nodemon - tự động reload)

```bash
npm run dev
```

### Production mode

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000` (hoặc port được cấu hình trong `.env`)

## 🔐 Xác thực

Dự án sử dụng JWT (JSON Web Token) để xác thực:

- **Access Token**: Có thời hạn 30 phút, được gửi trong header `Authorization: Bearer <token>`
- **Refresh Token**: Có thời hạn 14 ngày, được lưu trong database và có thể được gửi qua cookie hoặc body

## 📝 Ghi chú

- Tất cả các route trong `/api/matchmaking` đều được bảo vệ bởi middleware `protectedRoute`
- Matchmaking queue được lưu trong memory (Map), sẽ mất khi server restart
- Database schema cần được tạo trước khi chạy ứng dụng

## 🔄 Các tính năng chính

- ✅ Đăng ký/Đăng nhập/Đăng xuất
- ✅ Xác thực JWT
- ✅ Matchmaking (ghép đôi người chơi)
- ✅ Quản lý game
- 🔄 Quản lý nước đi (Move model đã có)
- 🔄 Hệ thống bạn bè (Friendship model đã có)
- 🔄 Thông báo (Notification model đã có)
- 🔄 Xếp hạng (Ranking model đã có)

## 📄 License

ISC

## 👤 Tác giả

[Thêm thông tin tác giả]

---

**Lưu ý:** Đây là dự án đang phát triển, một số tính năng có thể chưa hoàn thiện.
