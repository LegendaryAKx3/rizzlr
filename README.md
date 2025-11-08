# 🔥 Rizzlr - AI Dating Practice AppThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



Practice your dating conversation skills with AI matches! Swipe through profiles, match with AI personalities, and improve your "rizz" through realistic conversations.## Getting Started



## ✨ FeaturesFirst, run the development server:



- 🃏 **Tinder-style swipe interface** - Swipe left to pass, right to match```bash

- 🤖 **AI-powered conversations** - Chat with different AI personalitiesnpm run dev

- 💬 **Real-time chat** - Practice your conversation skills# or

- 📊 **Multiple AI personalities** - Each with unique interests and conversation stylesyarn dev

- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations# or

pnpm dev

## 🚀 Getting Started# or

bun dev

### Prerequisites```



- Node.js 18+ installedOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.

- A Groq API key (free at [console.groq.com](https://console.groq.com))

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Installation

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

1. **Get your Groq API key**:

   - Sign up at [https://console.groq.com](https://console.groq.com)## Learn More

   - Create a new API key (free tier available)

To learn more about Next.js, take a look at the following resources:

2. **Configure the API key**:

   - Open `.env.local`- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

   - Replace `your_groq_api_key_here` with your actual API key:- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

   ```

   NEXT_PUBLIC_GROQ_API_KEY=gsk_your_actual_key_hereYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

   ```

## Deploy on Vercel

3. **Install and run**:

   ```bashThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

   npm install

   npm run devCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

   ```

4. **Open the app**:
   - Visit [http://localhost:3000](http://localhost:3000)
   - Start swiping and matching!

## 💡 How to Use

1. **Swipe on profiles**: 
   - Drag cards left/right or use the buttons
   - Right = Match, Left = Pass

2. **Chat with matches**:
   - Click on any match in the sidebar
   - Start practicing your conversation skills
   - Each AI has a unique personality!

3. **Practice your rizz**:
   - Be authentic and engaging
   - Ask interesting questions
   - Show genuine interest
   - Use appropriate humor

## 🤖 AI Models

Using **Groq API** with **Llama 3.1 8B** model:
- ✅ Fast inference (~500 tokens/sec)
- ✅ Free tier: 30 requests/minute
- ✅ Cost-effective for production
- ✅ High-quality responses

### Alternative LLM Options

Want to try other models? Here are cheap alternatives:

1. **OpenRouter** ([openrouter.ai](https://openrouter.ai))
   - Access to multiple models
   - Pay-as-you-go pricing
   - Models from $0.10/1M tokens

2. **Together AI** ([together.ai](https://together.ai))
   - Fast inference
   - Competitive pricing
   - Great for production

## 📁 Project Structure

```
rizzlr/
├── app/
│   ├── page.tsx          # Main swipe interface
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── SwipeCard.tsx     # Swipeable card component
│   └── ChatInterface.tsx # Chat UI component
├── lib/
│   ├── aiMatches.ts      # AI personality profiles
│   └── groqClient.ts     # Groq API integration
└── types/
    └── index.ts          # TypeScript types
```

## 🎨 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Smooth animations
- **Groq API** - Fast, affordable LLM inference
- **Lucide React** - Beautiful icons

## 🔧 Configuration

### Adding More AI Matches

Edit `lib/aiMatches.ts` to add new personalities:

```typescript
{
  id: '6',
  name: 'Your AI Name',
  age: 25,
  bio: 'Your bio here',
  interests: ['interest1', 'interest2'],
  personality: 'personality description',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=YourName',
  conversationStyle: 'Your system prompt for this AI...'
}
```

### Customizing AI Behavior

Modify the `conversationStyle` field in each AI match to change how they respond. This is the system prompt that guides the AI's personality.

## 📝 License

MIT License - feel free to use this for your own projects!

## 🙏 Credits

- Built with ❤️ using Next.js
- AI powered by Groq
- Avatars from DiceBear

---

**Happy swiping and improving your rizz! 🚀💬**
