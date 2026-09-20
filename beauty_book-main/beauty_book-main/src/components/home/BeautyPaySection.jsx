import BeautyImage from '@/components/ui/BeautyImage';
export default function BeautyPaySection() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-foreground">Érable Beauty Pay</h2>
        <span className="text-primary font-bold text-sm uppercase tracking-wider">Finances</span>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <BeautyImage
            src="https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/7fc099f4a_generated_dacfbda3.png"
            alt="Beauty Pay"
            className="w-full h-36 object-cover"
          />
        </div>
        <div className="flex-1 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <BeautyImage
            src="https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/c4bc86383_generated_19d1ccce.png"
            alt="Beauty Pay"
            className="w-full h-36 object-cover"
          />
        </div>
      </div>
    </div>
  );
}