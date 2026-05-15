-- CreateTable
CREATE TABLE "hkjc_meeting_snapshots" (
    "id" SERIAL NOT NULL,
    "race_date" TEXT NOT NULL,
    "racecourse_code" TEXT NOT NULL,
    "racecourse_name" TEXT NOT NULL,
    "meeting_date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "race_count" INTEGER NOT NULL DEFAULT 0,
    "current_race_no" INTEGER,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hkjc_meeting_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hkjc_race_snapshots" (
    "id" SERIAL NOT NULL,
    "meeting_snapshot_id" INTEGER NOT NULL,
    "race_date" TEXT NOT NULL,
    "racecourse_code" TEXT NOT NULL,
    "race_no" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "race_name" TEXT NOT NULL,
    "meeting_date" TEXT NOT NULL DEFAULT '',
    "racecourse_name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '',
    "surface" TEXT NOT NULL DEFAULT '',
    "course" TEXT NOT NULL DEFAULT '',
    "distance" TEXT NOT NULL DEFAULT '',
    "going" TEXT NOT NULL DEFAULT '',
    "prize_money" TEXT NOT NULL DEFAULT '',
    "race_class" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "odds_available" BOOLEAN NOT NULL DEFAULT false,
    "odds_last_update_time" TEXT NOT NULL DEFAULT '',
    "runners_json" JSONB NOT NULL,
    "result_json" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hkjc_race_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hkjc_sync_runs" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "meetings_scanned" INTEGER NOT NULL DEFAULT 0,
    "races_upserted" INTEGER NOT NULL DEFAULT 0,
    "odds_refreshed" INTEGER NOT NULL DEFAULT 0,
    "results_finalized" INTEGER NOT NULL DEFAULT 0,
    "bets_settled" INTEGER NOT NULL DEFAULT 0,
    "failure_message" TEXT,

    CONSTRAINT "hkjc_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hkjc_meeting_snapshots_race_date_racecourse_code_key" ON "hkjc_meeting_snapshots"("race_date", "racecourse_code");

-- CreateIndex
CREATE INDEX "hkjc_race_snapshots_status_idx" ON "hkjc_race_snapshots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hkjc_race_snapshots_race_date_racecourse_code_race_no_key" ON "hkjc_race_snapshots"("race_date", "racecourse_code", "race_no");

-- AddForeignKey
ALTER TABLE "hkjc_race_snapshots" ADD CONSTRAINT "hkjc_race_snapshots_meeting_snapshot_id_fkey" FOREIGN KEY ("meeting_snapshot_id") REFERENCES "hkjc_meeting_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
