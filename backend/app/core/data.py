import os
import pandas as pd

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

def load_csv_safely(filename, default_cols):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        try:
            return pd.read_csv(filepath)
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
    # Return empty DataFrame with correct columns
    return pd.DataFrame(columns=default_cols)

# Load DataFrames dynamically
routers_df = load_csv_safely(
    "routers.csv", 
    ["router_id", "model", "firmware_version", "building", "room", "user_type", "issue_date"]
)

metrics_df = load_csv_safely(
    "metrics.csv", 
    ["router_id", "hour", "avg_speed_mbps", "latency_ms", "packet_loss_pct", "disconnects", "connected_devices", "signal_dbm"]
)

complaints_df = load_csv_safely(
    "complaints.csv", 
    ["ticket_id", "router_id", "date", "complaint_text"]
)

def get_fleet_averages():
    """Compute fleet-wide averages for each metric across the entire metrics table."""
    if metrics_df.empty:
        return {
            "fleet_avg_speed": 45.0,
            "fleet_avg_latency": 30.0,
            "fleet_avg_packet_loss": 1.2,
            "fleet_avg_disconnects": 2.0
        }
    return {
        "fleet_avg_speed": float(metrics_df["avg_speed_mbps"].mean()),
        "fleet_avg_latency": float(metrics_df["latency_ms"].mean()),
        "fleet_avg_packet_loss": float(metrics_df["packet_loss_pct"].mean()),
        "fleet_avg_disconnects": float(metrics_df.groupby("router_id")["disconnects"].sum().mean())
    }

def get_router_summary():
    """Aggregate metrics per router and left-join with complaints and router metadata."""
    # 1. Aggregate metrics per router
    if metrics_df.empty:
        agg_metrics = pd.DataFrame(columns=[
            "router_id", "avg_speed", "avg_latency", "avg_packet_loss", 
            "total_disconnects", "avg_signal", "bad_hours_fraction"
        ])
    else:
        # Make a copy to avoid SettingWithCopyWarning
        df_copy = metrics_df.copy()
        df_copy["is_bad_hour"] = df_copy["packet_loss_pct"] > 5.0
        
        group = df_copy.groupby("router_id")
        agg_metrics = group.agg(
            avg_speed=("avg_speed_mbps", "mean"),
            avg_latency=("latency_ms", "mean"),
            avg_packet_loss=("packet_loss_pct", "mean"),
            total_disconnects=("disconnects", "sum"),
            avg_signal=("signal_dbm", "mean"),
            bad_hours_fraction=("is_bad_hour", "mean")
        ).reset_index()
    
    # 2. Aggregate complaint counts per router
    if complaints_df.empty:
        complaint_counts = pd.DataFrame(columns=["router_id", "complaint_count"])
    else:
        complaint_counts = complaints_df.groupby("router_id").size().reset_index(name="complaint_count")
        
    # 3. Join everything on router_id
    summary = routers_df.merge(agg_metrics, on="router_id", how="left")
    summary = summary.merge(complaint_counts, on="router_id", how="left")
    
    # 4. Handle missing values gracefully
    summary["complaint_count"] = summary["complaint_count"].fillna(0).astype(int)
    
    # Default metric fallbacks if a router has absolutely no metrics
    if not summary.empty:
        fleet_avgs = get_fleet_averages()
        summary["avg_speed"] = summary["avg_speed"].fillna(fleet_avgs["fleet_avg_speed"])
        summary["avg_latency"] = summary["avg_latency"].fillna(fleet_avgs["fleet_avg_latency"])
        summary["avg_packet_loss"] = summary["avg_packet_loss"].fillna(fleet_avgs["fleet_avg_packet_loss"])
        summary["total_disconnects"] = summary["total_disconnects"].fillna(fleet_avgs["fleet_avg_disconnects"])
        summary["avg_signal"] = summary["avg_signal"].fillna(-55.0) # reasonable default signal
        summary["bad_hours_fraction"] = summary["bad_hours_fraction"].fillna(0.0)
        
    return summary
