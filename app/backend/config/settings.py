import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]

APP_ENV: str = os.getenv("APP_ENV", "development")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


@dataclass(frozen=True)
class SalesforceSettings:
    client_id: str
    client_secret: str
    username: str
    password: str
    security_token: str
    instance_url: str
    auth_url: str
    api_version: str
    timeout_seconds: int
    stage_name: str
    opportunity_channel_field: str
    lineitem_start_date_field: str
    lineitem_end_date_field: str
    lineitem_license_months_field: str
    lineitem_business_line_field: str


def get_salesforce_settings() -> SalesforceSettings:
    return SalesforceSettings(
        client_id=os.getenv("SF_CLIENT_ID", ""),
        client_secret=os.getenv("SF_CLIENT_SECRET", ""),
        username=os.getenv("SF_USERNAME", ""),
        password=os.getenv("SF_PASSWORD", ""),
        security_token=os.getenv("SF_SECURITY_TOKEN", ""),
        instance_url=os.getenv("SF_INSTANCE_URL", ""),
        auth_url=os.getenv("SF_AUTH_URL", ""),
        api_version=os.getenv("SF_API_VERSION", "60.0"),
        timeout_seconds=int(os.getenv("SF_TIMEOUT_SECONDS", "30")),
        stage_name=os.getenv("SF_SYNC_STAGE_NAME", "Closed Won"),
        opportunity_channel_field=os.getenv("SF_OPPORTUNITY_CHANNEL_FIELD", "LeadSource"),
        lineitem_start_date_field=os.getenv("SF_LINEITEM_START_DATE_FIELD", "ServiceDate"),
        lineitem_end_date_field=os.getenv("SF_LINEITEM_END_DATE_FIELD", "EndDate"),
        lineitem_license_months_field=os.getenv(
            "SF_LINEITEM_LICENSE_MONTHS_FIELD",
            "Licence_Period_Months__c",
        ),
        lineitem_business_line_field=os.getenv(
            "SF_LINEITEM_BUSINESS_LINE_FIELD",
            "Product2.Family",
        ),
    )
