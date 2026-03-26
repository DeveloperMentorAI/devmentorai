<!-- Premium Animated Banner -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=250&color=0:4F46E5,50:06B6D4,100:9333EA&text=%F0%9F%A7%A0%20DevMentor%20AI&fontSize=45&fontColor=ffffff&animation=fadeIn&fontAlignY=38" />
</p>

<!-- Animated Subtitle -->
<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&duration=3000&pause=1000&color=06B6D4&center=true&vCenter=true&width=700&lines=AI+Powered+Developer+Assistant;Explain+Code+%7C+Debug+Faster+%7C+Learn+Smarter;React+%7C+Node.js+%7C+OpenRouter;Deployed+on+Vercel+%7C+Render" />
</p>

<!-- Divider -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:4F46E5,50:06B6D4,100:9333EA" />
</p>

---

## 🏷 Badges

<p align="center">

![React](https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react)
![Node](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/API-Express-black?style=for-the-badge&logo=express)
![OpenAI](https://img.shields.io/badge/AI-OpenAI-orange?style=for-the-badge&logo=openai)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)
![Render](https://img.shields.io/badge/Backend-Render-purple?style=for-the-badge&logo=render)
![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge)

</p>

---

## 🌐 Live Demo
<p align="center">
  ⚙️ <a href="https://devmentorai-7v0o.onrender.com"><b>Backend API</b></a><br><br>
  🚀 <a href="https://devmentorai.vercel.app"><b>Frontend App</b></a>

</p>

## 🧠 Overview

**DevMentor AI** is an advanced AI-powered developer assistant that helps you:

- 🚀 Understand code faster  
- 🐛 Debug issues efficiently  
- 📚 Learn concepts easily  
- ⚡ Get real-time AI responses  

---

## ✨ Key Features

✔ AI Chat Assistant  
✔ Code Explanation & Debugging  
✔ Multiple AI Models  
✔ Streaming Responses  
✔ Clean UI  
✔ Session Memory  

---

## 🛠 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| AI | OpenAI / OpenRouter |
| Deployment | Vercel + Render |

---

## 📂 Project Structure

~~~
DevMentor/
├── client/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── server/
│   ├── server.js
│   ├── routes/
│   └── .env
│
└── README.md
~~~

---

## ⚙ How It Works

~~~
User → Frontend → Backend → AI → Streaming → UI
~~~

1. User enters prompt  
2. Request sent to backend  
3. Backend calls AI  
4. Response streams  
5. UI updates  

---

## 🔌 API

### GET /models

~~~json
{
  "models": [
    { "id": "openai/gpt-4o-mini", "label": "GPT-4o Mini" }
  ]
}
~~~

### POST /chat

~~~json
{
  "message": "Explain async await",
  "sessionId": "user-123",
  "model": "openai/gpt-4o-mini"
}
~~~

---

## 🚀 Run Locally

### Clone

~~~bash
git clone https://github.com/DeveloperMentorAI/devmentorai.git
cd devmentorai
~~~

### Backend

~~~bash
cd server
npm install
node server.js
~~~

.env:
~~~
OPENAI_API_KEY=your_key
PORT=5000
~~~

### Frontend

~~~bash
cd client
npm install
npm run dev
~~~

---

## 🌐 Deployment

### Vercel
~~~
VITE_API_URL=https://your-backend.onrender.com
~~~

### Render
~~~
npm install
node server.js
~~~

---

## ⚠ Issues

CORS fix:
~~~js
app.use(cors({ origin: "*" }));
~~~

---

## 📈 Future

- Auth  
- DB storage  
- Dark mode  
- Mobile  

---

## 👨‍💻 Developer

SDP_Hackathon Group 🚀

---

## ⭐ Support

Star ⭐ Fork 🍴 Share 📢

---

## 📜 License

Open-source
