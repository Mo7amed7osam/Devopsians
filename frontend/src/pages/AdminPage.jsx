import DashboardCard from "../components/DashBoardCard";
import styles from "./AdminPage.module.css";

function AdminPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: 30 }}>
          Welcome MR. Admin, what do you want to do today!
        </h1>
      </div>
      <div className={styles.adminPageContainer}>
        <DashboardCard
          title={"Add Hospitals"}
          icon={"🏥"}
          color={styles.colorLightgreen}
          route="/Addhospital"
        />
        <DashboardCard
          title={"View Hospitals"}
          icon={"🚑"}
          color={styles.colorLightred}
          route="/ViewHospital"
        />
        <DashboardCard
          title={"View All Admins"}
          icon={"👩‍💼"}
          color={styles.colorLightpurple}
          route="/"
        />
        <DashboardCard
          title={"View All Managers"}
          icon={"🛠️"}
          color={styles.colorLightyellow}
          route="/"
        />
      </div>
    </>
  );
}

export default AdminPage;
