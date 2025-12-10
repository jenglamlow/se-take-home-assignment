# Implementation Documentation

## Overview
A React + TypeScript frontend application simulating McDonald's automated order management system with cooking bots.

## Architecture

### Data Models
```typescript
Order: { id, type: 'normal'|'vip', status: 'pending'|'processing'|'complete', name, botId?, completedAt? }
Bot: { id, orderId, startTime }
```

### Core Logic

**VIP Priority Queue**
- VIP orders insert after existing VIP orders but before normal orders
- Uses array position to maintain priority (line 69-82)

**Bot Processing**
- 100ms interval checks for completed orders (elapsed >= 10s)
- Idle bots automatically pick up pending orders (VIP first)
- Uses refs to avoid stale closure issues in intervals (line 46-55)

**Order Lifecycle**
1. Created → `pending`
2. Bot picks up → `processing` (+ botId, startTime)
3. After 10s → `complete` (botId cleared, completedAt timestamp set)

**Display Sorting**
- Pending area: VIP orders first, then normal orders (insertion order)
- Complete area: Latest completed orders first (reverse chronological by completedAt)

**Bot Removal**
- Removes newest bot
- In-progress order returns to `pending` and re-sorts to maintain VIP priority (line 106-126)

### Components

**App** - Main container with state management and control buttons

**OrderCard** - Displays order with real-time progress bar (updates every 100ms)

**BotCard** - Shows bot status with countdown timer

## Key Features
- ✅ Unique incrementing order IDs
- ✅ Generated menu item names (cycles through 8 items)
- ✅ VIP orders processed before normal orders
- ✅ Each bot processes one order at a time for 10 seconds
- ✅ Visual progress indicators and countdown timers
- ✅ Dynamic bot management (add/remove)

## Technical Details
- **State Management**: React useState + useCallback for performance
- **Timing**: setInterval (100ms) for smooth UI updates
- **No Persistence**: All data in-memory as per requirements
