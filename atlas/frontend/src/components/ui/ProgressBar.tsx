type ProgressBarProps = {
  progress: number;
};

export default function ProgressBar({
  progress,
}: ProgressBarProps) {
  return (
    <div className="mt-8">
      <div className="flex justify-between mb-2">
        <span className="text-slate-300">
          Today's Progress
        </span>

        <span className="text-sky-400 font-semibold">
          {progress}%
        </span>
      </div>

      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}